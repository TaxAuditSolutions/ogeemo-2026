/**
 * What the user is shown after a tool that changes something, and which screens went stale (pure; see
 * tests/ai-tool-reply.test.ts).
 *
 * Found live on 11 Nov 2026: the model retold a tool's result and got it wrong both ways. A preview came back with the
 * tool's private note to the model pasted into it ("Show the user exactly this... Do not call changeEvent again"), and a
 * finished move ended with "Shall I go ahead?". So for a PREVIEW or a DONE from changeEvent / updateContact the reply is
 * the tool's own user-facing text (`userText`), word for word, and the model's retelling is not used. A preview always
 * carries "Nothing has changed yet", which the next "yes" is checked against.
 */
const OWN_REPLY_TOOLS = new Set(['changeEvent', 'updateContact']);

type Part = { toolResponse?: { name?: unknown; output?: unknown } };

/** Every tool result in the conversation Genkit returned, in order. */
function toolResults(messages: unknown): Array<{ name: string; output: Record<string, unknown> }> {
  if (!Array.isArray(messages)) return [];
  const results: Array<{ name: string; output: Record<string, unknown> }> = [];
  for (const message of messages) {
    const content = message && typeof message === 'object' ? (message as { content?: unknown }).content : null;
    if (!Array.isArray(content)) continue;
    for (const part of content as Part[]) {
      const response = part && typeof part === 'object' ? part.toolResponse : null;
      if (!response || typeof response.name !== 'string') continue;
      const output = response.output && typeof response.output === 'object' ? (response.output as Record<string, unknown>) : null;
      if (output) results.push({ name: response.name, output });
    }
  }
  return results;
}

/** Ask for the user's yes after a preview. Added here, not by the model, so it can never be missing or added to a finished change. */
export const ASK_TO_GO_AHEAD = 'Shall I go ahead?';

/**
 * The exact reply for this turn when the LAST tool that ran was a preview or a completed change, otherwise null (the
 * model's own words are used: questions, searches, refusals and everything else).
 */
export function toolOwnReply(messages: unknown): string | null {
  const results = toolResults(messages);
  const last = results[results.length - 1];
  if (!last || !OWN_REPLY_TOOLS.has(last.name)) return null;
  const text = typeof last.output.userText === 'string' ? last.output.userText.trim() : '';
  if (!text) return null;
  if (last.output.status === 'preview') return `${text}\n\n${ASK_TO_GO_AHEAD}`;
  if (last.output.status === 'done' && last.output.success === true) return text;
  return null;
}

export type ChangedArea = 'calendar' | 'contacts' | 'projects';
export const CHANGED_AREAS: readonly ChangedArea[] = ['calendar', 'contacts', 'projects'];

/**
 * The screens whose data the tools changed during this turn, read from the tools' own results (never the model's words),
 * so an open screen can reload instead of showing the old data until the page is refreshed. Only saves that succeeded.
 */
export function changedAreas(messages: unknown): ChangedArea[] {
  const found = new Set<ChangedArea>();
  for (const { name, output } of toolResults(messages)) {
    if (output.success !== true) continue;
    if (name === 'changeEvent' || name === 'createAppointment' || name === 'createTask') found.add('calendar');
    else if (name === 'createContact' || name === 'updateContact') found.add('contacts');
    else if (name === 'createProject') found.add('projects');
  }
  return CHANGED_AREAS.filter((area) => found.has(area));
}

/** Only known areas, from whatever the browser received. */
export function parseChangedAreas(value: unknown): ChangedArea[] {
  if (!Array.isArray(value)) return [];
  return CHANGED_AREAS.filter((area) => value.includes(area));
}
