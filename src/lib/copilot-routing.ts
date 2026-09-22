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
 * Contact-creation requests ("create a new contact for John", "open new
 * contact form") belong in the Co-Pilot conversation, which auto-opens the
 * prepared form. Only plain hub navigation ("open contacts", "contacts hub")
 * stays a command.
 */
const CONTACT_CREATION_PATTERN = /\bcontact\b/i;

export function isContactCreationRequest(message: string): boolean {
    const text = (message || '').trim();
    if (!CONTACT_CREATION_PATTERN.test(text)) return false;
    return /\b(create|new|add|form)\b/i.test(text);
}

/**
 * Outside an open assistant question the command processor still decides; inside
 * one only an explicit command verb may interrupt the conversation.
 */
export function shouldProcessAsCommand(message: string, history: CopilotRoutingMessage[]): boolean {
    const text = (message || '').trim();
    if (!text) return false;
    if (isContactCreationRequest(text)) return false;
    if (!isAwaitingAssistantReply(history)) return true;
    const activeContactWorkflow = history.slice(-8).some((entry) =>
        /\b(contact|full legal name|folder\/category|create it)\b/i.test(entry.content)
    );
    if (activeContactWorkflow) return false;
    return COMMAND_VERBS.has(firstToken(text));
}
