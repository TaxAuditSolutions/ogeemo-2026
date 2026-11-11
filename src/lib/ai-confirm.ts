/**
 * Whether the user's message is a plain "yes" (pure; see tests/ai-confirm.test.ts).
 *
 * Cancelling an event cannot be undone, so the Co-Pilot first PREVIEWS a change and only applies it after the user says
 * yes in their NEXT message. That decision must not rest on the model: it could pass a "confirm" flag straight away. So
 * the SERVER reads the user's message, decides here, and hands the result to the tool through the same trusted context
 * that carries the user's identity. A message that adds anything (a new time, "but", "no") is not a plain yes: it is a
 * different request and starts a new preview.
 */

const MAX_WORDS = 8;

const AFFIRMATIVE = /^(yes|yep|yeah|yup|sure|ok|okay|confirm|confirmed|go ahead|do it|please do|proceed|that s right|that is right|correct|absolutely|definitely)\b/;

/** Words that turn a yes into something else: a refusal, a condition or a change of mind. */
const NOT_A_PLAIN_YES = /\b(no|not|dont|don t|do not|never|but|instead|actually|wait|however|rather|change|different|except|only if|unless)\b/;

function normalize(text: string): string {
  return text.toLowerCase().replace(/['\u2019]/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** True only for a short, unconditional yes: "yes", "yes please", "go ahead", "ok do it". */
export function isUserConfirmation(message: unknown): boolean {
  if (typeof message !== 'string') return false;
  const text = normalize(message);
  if (!text) return false;
  if (text.split(' ').length > MAX_WORDS) return false;
  if (/\d/.test(text)) return false;
  if (!AFFIRMATIVE.test(text)) return false;
  return !NOT_A_PLAIN_YES.test(text);
}

/** What the server decided about this message, read back from the context it gave the flow. Anything odd is "no". */
export function readUserConfirmed(context: unknown): boolean {
  return Boolean(context && typeof context === 'object' && (context as { userConfirmed?: unknown }).userConfirmed === true);
}

/**
 * When the user's current message arrived (milliseconds), set by the server as the flow starts. A preview can only be
 * confirmed by a yes that came AFTER it was made, so a preview saved during this turn can never be confirmed in this
 * turn. Without that, a model could preview one event and "confirm" it in the same breath on the strength of a yes the
 * user gave to a different one. Missing or odd values come back as undefined, which means nothing can be applied.
 */
export function readTurnStartedAt(context: unknown): Date | undefined {
  const raw = context && typeof context === 'object' ? (context as { turnStartedAt?: unknown }).turnStartedAt : undefined;
  return typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? new Date(raw) : undefined;
}

/**
 * The sentence a preview must contain. The preview comes from a tool, but the model rewords it, so this is checked on
 * what the USER was actually shown. A reworded preview that loses it is not confirmable: the safe direction, because
 * the user then just asks again.
 */
const PREVIEW_MARKER = /\bnothing (has |have )?(been )?(changed|moved|cancelled|canceled|deleted|saved|done)( yet)?\b|\bno changes? (have|has) been made\b/i;

const asText = (value: unknown): string => (typeof value === 'string' ? value : '');
const isModel = (role: unknown) => role === 'model' || role === 'assistant' || role === 'bot';

/**
 * True when this message is a plain yes AND the Co-Pilot's most recent reply was a preview that said nothing had
 * changed yet. A yes to some other question, or a yes after the conversation moved on, is not a confirmation.
 * `history` may or may not already contain the user's current message; only the last Co-Pilot turn matters.
 */
export function isConfirmingPreview(history: unknown, message: unknown): boolean {
  if (!isUserConfirmation(message) || !Array.isArray(history)) return false;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const entry = history[i];
    if (!entry || typeof entry !== 'object') continue;
    if (isModel((entry as { role?: unknown }).role)) return PREVIEW_MARKER.test(asText((entry as { content?: unknown }).content));
  }
  return false;
}

/** True when a reply the user was shown is a preview waiting for a yes (used to keep that yes in the conversation). */
export function isPreviewReply(text: unknown): boolean {
  return PREVIEW_MARKER.test(asText(text));
}
