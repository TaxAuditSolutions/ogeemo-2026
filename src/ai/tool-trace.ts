/**
 * Which tools the model called while answering one message (pure; see tests/ai-tool-trace.test.ts).
 *
 * The tool names are the only part of a turn that says whether the model chose well, and nothing recorded them. This
 * reads them from the conversation Genkit returns (a model turn holds `toolRequest` parts), in the order they were
 * called, so the server can log them and the eval can check them. Only names leave here: never the arguments, which can
 * hold client names and amounts.
 */
const NAME = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;

/** The tool names called in `messages`, in order, repeats kept. Anything that is not a plain tool name is dropped. */
export function toolsCalled(messages: unknown): string[] {
  if (!Array.isArray(messages)) return [];
  const names: string[] = [];
  for (const message of messages) {
    const content = message && typeof message === 'object' ? (message as { content?: unknown }).content : null;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      const request = part && typeof part === 'object' ? (part as { toolRequest?: { name?: unknown } }).toolRequest : null;
      const name = request && typeof request.name === 'string' ? request.name : '';
      if (NAME.test(name)) names.push(name);
    }
  }
  return names;
}

/** Tools that save something. After one of these ran, running the request again could save it twice. */
const WRITES = new Set(['createTask', 'createProject', 'createContact', 'createAppointment']);

/**
 * True when the model came back with no words and had not called any tool, so nothing has happened yet and asking
 * again is safe. It is never true once any tool ran: a retry after a write could create the record twice.
 */
export function shouldRetryEmptyReply(text: unknown, called: readonly string[]): boolean {
  const empty = typeof text !== 'string' || text.trim() === '';
  return empty && called.length === 0;
}

/**
 * What to tell the user when the model returned no words even after a retry. It used to say "I processed your
 * request", which claims a success nobody checked. This says what is actually known: if a tool that saves something
 * ran, it may have saved, so the user is told to check rather than to repeat.
 */
export function emptyReplyMessage(called: readonly string[]): string {
  if (called.some((name) => WRITES.has(name))) {
    return 'I started that, but I did not get a clear answer back, so I cannot confirm it was saved. Please check before asking again, so it is not done twice.';
  }
  return 'I could not put together an answer to that, and nothing was changed. Please try asking again, or say it a little differently.';
}

/** "searchContacts, getInvoices" for a log line, or "none". */
export function describeToolsCalled(names: readonly string[]): string {
  return names.length === 0 ? 'none' : names.join(', ');
}
