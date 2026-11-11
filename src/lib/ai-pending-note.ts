/**
 * What the model is told when the user's message is a plain yes to a preview (pure; see tests/ai-pending-note.test.ts).
 *
 * The chat history holds only the WORDS of a preview ("Ready to move Test Meeting ... Nothing has changed yet"), never
 * the id of the event or contact it was about. On the "yes" turn the model therefore had nothing to pass to
 * changeEvent and sometimes invented an id, which the server rightly refused (found live: "Move my 3pm to 4pm", then
 * "yes"). The server already holds the exact plan it previewed (aiPendingChanges/<userId>), so it states that plan to
 * the model for this one turn. Nothing here widens what can happen: the call must still equal the saved plan, the
 * plan must be recent, and the server still has to have read the user's own message as a plain yes.
 */
import { PENDING_MINUTES } from '@/lib/ai-event-change';

const RECORD_ID = /^[A-Za-z0-9_-]{1,128}$/;

const isoOrNull = (value: unknown): string | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
};

/**
 * One line for the model's instructions, or '' when there is nothing safe to say: no saved preview, one for another
 * workspace, a stale one, or one that is not understood. Only ids and times that the server itself saved are used.
 */
export function pendingPreviewNote(saved: unknown, orgId: string | undefined, now: Date = new Date()): string {
  if (!saved || typeof saved !== 'object' || !orgId) return '';
  const p = saved as Record<string, unknown>;
  if (p.orgId !== orgId || typeof p.createdAt !== 'number') return '';
  const age = now.getTime() - p.createdAt;
  if (age > PENDING_MINUTES * 60_000 || age < -60_000) return '';

  if (p.kind === 'contact') {
    if (typeof p.contactId !== 'string' || !RECORD_ID.test(p.contactId)) return '';
    return `Waiting for the user's yes: a previewed change to the contact with id ${p.contactId}. If they said yes, call updateContact with contactId exactly "${p.contactId}" and the same changes you previewed. Do not search for the contact again and do not change any value.`;
  }

  if (typeof p.eventId !== 'string' || !RECORD_ID.test(p.eventId)) return '';
  if (p.action === 'cancel') {
    return `Waiting for the user's yes: a previewed cancel. If they said yes, call changeEvent with exactly ${JSON.stringify({ eventId: p.eventId, action: 'cancel', ...(p.allowDoubleBooking === true ? { allowDoubleBooking: true } : {}) })}. Do not call getCalendar first and do not change any value.`;
  }
  if (p.action === 'move') {
    const startTime = isoOrNull(p.toStart);
    const endTime = isoOrNull(p.toEnd);
    if (!startTime || !endTime) return '';
    const args = { eventId: p.eventId, action: 'move', startTime, endTime, ...(p.allowDoubleBooking === true ? { allowDoubleBooking: true } : {}) };
    return `Waiting for the user's yes: a previewed move. If they said yes, call changeEvent with exactly ${JSON.stringify(args)}. Do not call getCalendar first and do not change any value.`;
  }
  return '';
}
