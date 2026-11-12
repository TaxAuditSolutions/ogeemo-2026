/**
 * The honest note on an answer from the no-tools fallback assistant (pure; see tests/ai-fallback-note.test.ts).
 *
 * Found live on 12 Nov 2026: after the model upgrade the main assistant failed on every tool call, so the route used the
 * fallback assistant, which has NO tools. Asked to change a phone number it answered "Requested to update the phone
 * number" and then "Requested to save the changes", as if it had acted. Nothing was saved. The fallback prompt now says
 * it cannot act, but a model can still word things badly, so when the main assistant did not answer, the SERVER adds a
 * plain sentence of its own that no model can leave out.
 */
export const TOOLS_UNAVAILABLE_NOTE = "Ogeemo's tools were unavailable for this message, so nothing was saved or changed. Please try again in a moment.";

export type AssistantOutcome = 'accepted' | 'empty_reply' | 'refusal_pattern' | 'error';

/** The fallback assistant's answer, with the server's own note when the main (tool-using) assistant did not answer. */
export function fallbackAnswer(answer: string, mainOutcome: AssistantOutcome): string {
  const text = typeof answer === 'string' ? answer.trim() : '';
  if (!text) return TOOLS_UNAVAILABLE_NOTE;
  if (mainOutcome === 'accepted') return text;
  return `${text}\n\n_${TOOLS_UNAVAILABLE_NOTE}_`;
}
