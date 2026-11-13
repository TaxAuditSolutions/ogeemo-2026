/**
 * Stopping the assistant from claiming it OPENED something (pure; see tests/capability-claims.test.ts).
 *
 * The chat opens screens and Google apps itself, in the browser, and writes its own replies for them: "Opening Google Maps
 * in a new tab. If it does not open, click 'Google Maps' below." Those replies sit in the chat history the assistant reads
 * on the next message. For "open gemini" the assistant copied that wording, so it SAID it was opening Gemini, with no
 * tab and no button, because only the chat's own code can attach those (found live, 13 Nov 2026).
 *
 * Two protections, both here:
 *   1. The history the assistant reads marks those replies as the chat's own, so it does not mistake them for its words.
 *   2. A reply that claims to be opening something, from the assistant, is replaced with an honest one.
 */

/** The openers the chat writes itself for a screen or an outside app. */
const OPENING_CLAIM = /^\s*Opening\s+[^.\n]{1,80}?(?:\s+in a new tab)?\.\s+If it does not open, click\b/i;
const READY_CLAIM = /^\s*[^.\n]{1,80}\s+is ready\.\s+Click\s+'[^']{1,80}'\s+below to open it\./i;

/** True when `text` is worded like the chat's own "opening / ready" replies. */
export function looksLikeOpeningClaim(text: unknown): boolean {
  if (typeof text !== 'string') return false;
  return OPENING_CLAIM.test(text) || READY_CLAIM.test(text);
}

/** The note added to the chat's own opening replies in the history the assistant reads. */
export const CHAT_OPENED_NOTE = '[This reply was written by the Ogeemo chat itself, with a button attached. It is not something the assistant said or can do.]';

/**
 * The history the assistant reads, with each of the chat's own opening replies marked as such. Only model turns that look
 * like those replies are touched; everything else is passed through as it is.
 */
export function markChatOpenings<T extends { role?: unknown; content?: unknown }>(history: readonly T[]): T[] {
  return history.map((entry) => {
    const isModel = entry && (entry.role === 'model' || entry.role === 'assistant');
    if (!isModel || typeof entry.content !== 'string' || !looksLikeOpeningClaim(entry.content)) return entry;
    return { ...entry, content: `${entry.content}\n${CHAT_OPENED_NOTE}` };
  });
}

/** What the person is told instead of an assistant reply that claims to open something. */
export const NOTHING_OPENED_MESSAGE = 'I did not open anything. To open a screen or a Google app, say its name, for example "open contacts" or "open google maps".';

/** The assistant's reply, or the honest one when it claims to have opened something it cannot open. */
export function withoutFalseOpening(reply: string): string {
  return looksLikeOpeningClaim(reply) ? NOTHING_OPENED_MESSAGE : reply;
}
