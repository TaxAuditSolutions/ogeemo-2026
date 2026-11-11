/**
 * Which tools the Co-Pilot is OFFERED for a person's role (pure; see tests/ai-tool-access.test.ts).
 *
 * Every tool already refuses a role that may not use it, but a refusal costs a model call and, as the tool-choice eval
 * showed, the model sometimes ignores the prompt rule that says not to try. Not offering the tool is stronger than
 * asking the model not to use it, and it also shortens what the model has to read. The tools keep their own checks;
 * this is a second layer, not a replacement.
 *
 * An unknown or missing role gets the same as a viewer: the least.
 */
import { canCreateTasks } from '@/lib/ai-task';

export type ToolAudience = 'everyone' | 'editor';

/**
 * Every tool, and who gets it. A tool that is missing here is not offered to anyone, and tests/ai-tool-access.test.ts
 * fails if a tool is defined in the agent but not listed, so a new tool cannot skip the decision.
 */
export const TOOL_ACCESS: Readonly<Record<string, ToolAudience>> = {
  searchGlobal: 'everyone',
  searchContacts: 'everyone',
  getCalendar: 'everyone',
  getTimeSummary: 'everyone',
  searchKnowledge: 'everyone',
  syncReceipts: 'everyone',
  createTask: 'editor',
  createProject: 'editor',
  createContact: 'editor',
  createAppointment: 'editor',
  changeEvent: 'editor',
  getInvoices: 'editor',
  getQuotes: 'editor',
};

/** The tool names offered to this role, in the order given. */
export function toolNamesForRole(accessLevel: unknown, names: readonly string[]): string[] {
  const editor = canCreateTasks(accessLevel);
  return names.filter((name) => {
    const audience = TOOL_ACCESS[name];
    return audience === 'everyone' || (audience === 'editor' && editor);
  });
}

/** What each withheld tool would have let the person do, in the words the Co-Pilot should use. */
const WITHHELD_FOR: Readonly<Record<string, string>> = {
  createTask: 'make a to-do or task',
  createProject: 'add a project',
  createContact: 'add a contact',
  createAppointment: 'book an appointment',
  changeEvent: 'move or cancel an event',
  getInvoices: 'read invoices',
  getQuotes: 'read quotes',
};

/**
 * One line for the system prompt naming what this person's role cannot do, or '' when nothing is withheld. The model
 * otherwise reads the knowledge files, which describe every tool, and tells a viewer it can do things it was not given.
 */
export function describeToolLimits(accessLevel: unknown, names: readonly string[]): string {
  const offered = new Set(toolNamesForRole(accessLevel, names));
  const withheld = names.filter((name) => !offered.has(name) && WITHHELD_FOR[name]);
  if (withheld.length === 0) return '';
  const things = withheld.map((name) => WITHHELD_FOR[name]);
  return `toolLimits: this person's role CANNOT ${things.join(', ')}. You do not have those tools for them. When they ask for one of those, say so in your first sentence, before asking for any details, and say an editor or administrator can do it. When they ask what you can do, leave all of those out and ignore any capability above that mentions them: you can only search, read their calendar and time, and explain how Ogeemo works.`;
}

/**
 * The reply when the model asks for a tool that was not offered to this role. The model should not, but it can: it
 * reads the tool names in the knowledge files. Genkit then throws "Tool X not found", which used to reach the user as
 * "the Google AI service is currently unresponsive", an outage that never happened. Returns null for any other error.
 */
export function unofferedToolReply(error: unknown): { tool: string; reply: string } | null {
  const text = error && typeof error === 'object' ? String((error as { originalMessage?: unknown }).originalMessage ?? (error as { message?: unknown }).message ?? '') : '';
  const match = /^Tool ([A-Za-z][A-Za-z0-9_]{0,63}) not found/.exec(text.trim());
  if (!match || !(match[1] in WITHHELD_FOR)) return null;
  return {
    tool: match[1],
    reply: `Your role can look things up in this workspace but cannot ${WITHHELD_FOR[match[1]]}. An editor or administrator can do that, or can change your role.`,
  };
}

