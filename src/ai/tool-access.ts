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
