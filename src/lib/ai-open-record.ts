/**
 * Opening the screen of a record the Co-Pilot has just saved (pure; see tests/ai-open-record.test.ts). A contact or
 * project opens its form; a booked appointment or a timed to-do opens the Calendar; a plain to-do opens the To-Do List.
 *
 * "Add a contact named Test Person" and "add a project called Website Redesign" save at once, which left the person
 * looking at a chat reply with nothing to check or add to. Now the saved record's own form opens too, so they can
 * confirm it and fill in details. The record is already saved: closing the form changes nothing.
 *
 * The id comes from what the SERVER's tool returned, never from anything the model wrote, and only a save that
 * reported success counts, so a held-back duplicate or a refusal opens nothing.
 */

export type SavedRecord = { kind: 'contact' | 'project' | 'calendar' | 'todo'; id: string };

/** The ids Firestore hands out. Anything else is not a record id. */
const RECORD_ID = /^[A-Za-z0-9_-]{6,64}$/;

/** The create tools whose result opens a screen, and which id they return. */
const OPENING_TOOLS: Record<string, { idField: string }> = {
  createContact: { idField: 'contactId' },
  createProject: { idField: 'projectId' },
  createAppointment: { idField: 'appointmentId' },
  createTask: { idField: 'taskId' },
};

/**
 * What a successful create tool opened. A booked appointment is on the Calendar. A task says where it landed (`screen`,
 * set by the server's own handler): a timed one on the Calendar, a plain to-do on the To-Do List, and a task inside a
 * project on neither, so nothing opens for it.
 */
function kindFor(name: string, output: Record<string, unknown>): SavedRecord['kind'] | null {
  if (name === 'createContact') return 'contact';
  if (name === 'createProject') return 'project';
  if (name === 'createAppointment') return 'calendar';
  if (name === 'createTask') return output.screen === 'calendar' ? 'calendar' : output.screen === 'todo' ? 'todo' : null;
  return null;
}

/** The last record saved while answering one message, read from the conversation Genkit returns; null if none. */
export function savedRecord(messages: unknown): SavedRecord | null {
  if (!Array.isArray(messages)) return null;
  let found: SavedRecord | null = null;
  for (const message of messages) {
    const content = message && typeof message === 'object' ? (message as { content?: unknown }).content : null;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      const response = part && typeof part === 'object' ? (part as { toolResponse?: { name?: unknown; output?: unknown } }).toolResponse : null;
      if (!response || typeof response.name !== 'string') continue;
      const tool = OPENING_TOOLS[response.name];
      const output = response.output && typeof response.output === 'object' ? (response.output as Record<string, unknown>) : null;
      if (!tool || !output || output.success !== true) continue;
      const kind = kindFor(response.name, output);
      const id = output[tool.idField];
      if (kind && typeof id === 'string' && RECORD_ID.test(id)) found = { kind, id };
    }
  }
  return found;
}

/** The path of a project's own form (the Project Planner's details step, opened for that project). */
export function projectFormTarget(projectId: string): string {
  return `/projects/create?projectId=${encodeURIComponent(projectId)}`;
}

/**
 * The action the browser carries out for a saved record. A contact reuses the action every Co-Pilot screen already
 * understands (it opens that contact's form, on the Contacts Hub or in the sidebar). A project is a link to its form,
 * which also stays in the chat as a button in case the page does not open.
 */
export function openActionFor(record: SavedRecord | null | undefined):
  | { type: 'open_contact'; contactId: string }
  | { type: 'dispatch'; target: string; isExternal: false; label: string; category: string }
  | undefined {
  if (!record || !RECORD_ID.test(record.id)) return undefined;
  if (record.kind === 'contact') return { type: 'open_contact', contactId: record.id };
  if (record.kind === 'project') {
    return { type: 'dispatch', target: projectFormTarget(record.id), isExternal: false, label: 'Open Project', category: 'Operations' };
  }
  if (record.kind === 'calendar') return { type: 'dispatch', target: CALENDAR_SCREEN, isExternal: false, label: 'Open Calendar', category: 'Workspace' };
  if (record.kind === 'todo') return { type: 'dispatch', target: TODO_SCREEN, isExternal: false, label: 'Open To-Do List', category: 'Workspace' };
  return undefined;
}

const CALENDAR_SCREEN = '/calendar';
const TODO_SCREEN = '/to-do';

/**
 * Whether a link from the Co-Pilot service is the Calendar or the To-Do List, which the browser may open by itself
 * after something was saved there. Exactly these two paths, no query: anything else the service sends stays a button.
 */
export function isSavedScreenTarget(target: unknown): target is string {
  return target === CALENDAR_SCREEN || target === TODO_SCREEN;
}

/**
 * One plain sentence added to the reply when a form opens, so the person is told why a form appeared. It is added by
 * the server, not left to the model, so it is always there and never claims more than is true: the record is saved,
 * and the form is for checking it and adding details.
 */
export function openedFormNote(record: SavedRecord | null | undefined): string {
  if (!record || !openActionFor(record)) return '';
  if (record.kind === 'calendar') return 'It is saved. The Calendar is opening so you can see it.';
  if (record.kind === 'todo') return 'It is saved. The To-Do List is opening so you can see it.';
  return record.kind === 'contact'
    ? 'It is saved. Its form is opening so you can check it and add details.'
    : 'It is saved. Its form is opening so you can check it and add details; saving there updates the same project.';
}

const PROJECT_FORM = /^\/projects\/create\?projectId=[A-Za-z0-9_-]{6,64}$/;

/**
 * Whether a reply from the Co-Pilot service is a saved project's form, which the browser may open by itself. It is
 * deliberately the only service-sent link that opens on its own: other links the service sends stay as buttons.
 */
export function isProjectFormTarget(target: unknown): target is string {
  return typeof target === 'string' && PROJECT_FORM.test(target);
}
