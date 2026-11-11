/**
 * @fileOverview Decides whether a Co-Pilot message is a direct command or a
 * reply inside an ongoing assistant-led exchange.
 */

export interface CopilotRoutingMessage {
    role: 'user' | 'model';
    content: string;
}

const COMMAND_VERBS = new Set([
    'go', 'goto', 'open', 'show', 'view', 'launch', 'navigate',
    'create', 'make', 'new', 'add', 'do', 'schedule', 'book', 'plan',
    'track', 'time', 'start', 'log', 'begin',
]);

function firstToken(text: string): string {
    return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)[0] ?? '';
}

/**
 * True when the assistant spoke last and asked the user something, which means
 * the next user turn is an answer rather than a fresh command.
 */
export function isAwaitingAssistantReply(history: CopilotRoutingMessage[]): boolean {
    const lastMessage = history[history.length - 1];
    if (!lastMessage || lastMessage.role !== 'model') return false;
    return lastMessage.content.includes('?');
}

/**
 * Contact-editing requests ("edit John's contact", "update Jane's phone
 * number", "add an email address to the contact 'Cookie Monster'") belong in
 * the Co-Pilot conversation, which searches for the matching record and opens
 * it for editing, the same way creation requests do.
 */
const CONTACT_EDIT_PATTERN = /\bcontact\b/i;

export function isContactEditRequest(message: string): boolean {
    const text = (message || '').trim();
    if (!CONTACT_EDIT_PATTERN.test(text)) return false;
    if (/\b(edit|update|modify|change)\b/i.test(text)) return true;
    // Phrases like "add [an email / a phone] to the contact ..." are editing requests
    if (/\badd\b[\s\S]+\bto\s+(?:the\s+)?contact\b/i.test(text)) return true;
    return false;
}

/**
 * Contact-creation requests ("create a new contact for John", "open new
 * contact form") belong in the Co-Pilot conversation, which auto-opens the
 * prepared form. Only plain hub navigation ("open contacts", "contacts hub")
 * stays a command.
 */
const CONTACT_CREATION_PATTERN = /\bcontact\b/i;

export function isContactCreationRequest(message: string): boolean {
    const text = (message || '').trim();
    if (!CONTACT_CREATION_PATTERN.test(text)) return false;
    // An edit request such as "add an email address to the contact" must not be treated as creation
    if (isContactEditRequest(text)) return false;
    return /\b(create|new|add|form)\b/i.test(text);
}

/**
 * Appointment requests ("book a meeting with Dana tomorrow at 3pm", "schedule an appointment") belong in the
 * Co-Pilot conversation, where createAppointment books them on the Calendar. Left to the command processor they
 * were only turned into a link to the Activity Manager. "appointment" alone is enough; "meeting" or "call" also
 * needs a day or time in the sentence, so "open the Meetings page" and "create a meeting agenda" stay as they were.
 */
const BOOKING_VERB = /\b(book|schedule|set\s*up|arrange|make|create|add|plan|put)\b/i;
const APPOINTMENT_NOUN = /\bappointments?\b/i;
const MEETING_NOUN = /\b(meeting|call|catch-?up|consultation)\b/i;
const NOT_AN_APPOINTMENT = /\b(agenda|meeting\s+(minutes|notes)|template|invoice|quote)\b/i;
const TIME_CUE = new RegExp(
    '\\b(\\d{1,2}(:\\d{2})?\\s*(am|pm|a\\.m\\.|p\\.m\\.)|at\\s+\\d{1,2}(:\\d{2})?|noon|midnight|tomorrow|today|tonight|' +
        'monday|tuesday|wednesday|thursday|friday|saturday|sunday|next\\s+(week|month|\\w+day)|on\\s+(the\\s+)?\\d{1,2}|\\d{4}-\\d{2}-\\d{2})\\b',
    'i',
);

export function isAppointmentRequest(message: string): boolean {
    const text = (message || '').trim();
    if (!text || NOT_AN_APPOINTMENT.test(text) || !BOOKING_VERB.test(text)) return false;
    if (APPOINTMENT_NOUN.test(text)) return true;
    return MEETING_NOUN.test(text) && TIME_CUE.test(text);
}

/**
 * Questions about the user's own calendar ("what's on my calendar tomorrow", "what do I have this week", "am I free
 * at 3") are answered by the Co-Pilot from getCalendar. The command processor used to answer the first as a plain
 * link to the Calendar.
 */
const CALENDAR_QUESTION = /\b(am i (free|busy|available)|do i have (anything|any|a)|what(?:'s|\s+is|\s+do i have|\s+am i doing)|anything (on|scheduled))\b/i;
const CALENDAR_TOPIC = new RegExp(
    '\\b(calendar|schedule|today|tomorrow|tonight|this (week|morning|afternoon|evening)|next week|free|busy|available|' +
        'monday|tuesday|wednesday|thursday|friday|saturday|sunday)\\b',
    'i',
);

export function isCalendarQuestion(message: string): boolean {
    const text = (message || '').trim();
    return CALENDAR_QUESTION.test(text) && CALENDAR_TOPIC.test(text);
}

/**
 * To-do and task requests ("make a to-do", "add a T-Do: call the bank", "create a task for Friday", "remind me to call
 * Dana") belong in the Co-Pilot conversation, where createTask saves them. Left to the command processor they only
 * opened the To-Do List or the Activity Manager. A creation word is required, so "open my tasks" stays navigation.
 */
const CREATE_VERB = /\b(create|make|new|add|set\s*up|start)\b/i;
const TASK_NOUN = /\b(to[\s-]?do|t[\s-]?do|todo|tasks?|reminders?)\b/i;
const NOT_A_RECORD_REQUEST = /\b(template|report|invoice|quote|form|agenda|timer|time\s*log|worksheet)\b/i;

export function isTaskRequest(message: string): boolean {
    const text = (message || '').trim();
    if (!text || NOT_A_RECORD_REQUEST.test(text)) return false;
    if (/\bremind\s+me\b/i.test(text)) return true;
    return CREATE_VERB.test(text) && TASK_NOUN.test(text);
}

/**
 * Project-creation requests ("add a new project", "create a project called Website Redesign") are saved by the
 * createProject tool. Asking for the form ("open the new project form") or anything about templates stays as it was.
 */
const PROJECT_NOUN = /\bprojects?\b/i;

export function isProjectCreationRequest(message: string): boolean {
    const text = (message || '').trim();
    if (!text || NOT_A_RECORD_REQUEST.test(text) || isTaskRequest(text)) return false;
    if (/\b(open|go|goto|show|view|launch|navigate)\b/i.test(text)) return false;
    return CREATE_VERB.test(text) && PROJECT_NOUN.test(text);
}

/** The assistant just asked what to call a task or project, or whether to create a same-named one. */
function isAnsweringTaskOrProjectQuestion(history: CopilotRoutingMessage[]): boolean {
    const last = history[history.length - 1];
    if (!last || last.role !== 'model') return false;
    return /\b(project|task|to-?do|reminder)\b/i.test(last.content)
        && /\b(what (should|would you like)|called|name|title|what time|which day|already exists|same name|anyway)\b/i.test(last.content);
}

/**
 * Outside an open assistant question the command processor still decides; inside
 * one only an explicit command verb may interrupt the conversation.
 */
export function shouldProcessAsCommand(message: string, history: CopilotRoutingMessage[]): boolean {
    const text = (message || '').trim();
    if (!text) return false;
    if (isContactCreationRequest(text) || isContactEditRequest(text)) return false;
    if (isAppointmentRequest(text) || isCalendarQuestion(text)) return false;
    if (isTaskRequest(text) || isProjectCreationRequest(text)) return false;
    if (!isAwaitingAssistantReply(history)) return true;
    if (isAnsweringTaskOrProjectQuestion(history)) return false;
    // Answering "book it anyway?" or "which time?" is part of the booking, not a new command.
    const activeAppointmentWorkflow = history.slice(-8).some((entry) =>
        /\b(appointment|booked|nothing was booked|overlaps|free time|next free|double.?book|what time)\b/i.test(entry.content)
    );
    if (activeAppointmentWorkflow) return false;
    const activeContactWorkflow = history.slice(-8).some((entry) =>
        /\b(contact|full legal name|folder\/category|create it|which contact|confirm|save)\b/i.test(entry.content)
    );
    if (activeContactWorkflow) return false;
    return COMMAND_VERBS.has(firstToken(text));
}
