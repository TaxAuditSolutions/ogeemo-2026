/**
 * Moving or cancelling an event on the user's calendar for the AI assistant (pure; see tests/ai-event-change.test.ts).
 *
 * A cancel cannot be undone, and an event title is text anyone can have typed, so nothing is changed on the first ask.
 * The first call builds a PLAN and the server remembers it as a pending change; the change is only applied when the
 * user's next message is a plain yes (src/lib/ai-confirm.ts) AND the call describes exactly the plan that was shown.
 * Anything else, including the same event with a different time, is a new request and gets a new preview.
 */
import { describeSlot } from '@/lib/ai-calendar';
import { oneLine } from '@/lib/ai-input';
import { canCreateTasks } from '@/lib/ai-task';
import { parseWhenInZone } from '@/lib/ai-time';
import { MAX_APPOINTMENT_MINUTES } from '@/lib/ai-appointment';

/** The same roles that may create tasks may change them: an editor or above. */
export const canChangeEvents = canCreateTasks;

export type ChangeAction = 'move' | 'cancel';

/** How long a preview waits for its yes. */
export const PENDING_MINUTES = 10;

const MINUTE_MS = 60_000;
const MIN_MINUTES = 5;
const PAST_GRACE_MS = 5 * MINUTE_MS;
const FIRESTORE_ID = /^[A-Za-z0-9_-]{1,128}$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
/** An all-day event moved to a time of day has no length of its own to keep. */
const ALL_DAY_MOVE_MINUTES = 60;

export interface ChangeInput {
  eventId?: string;
  action?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  /** Only after the user said to move it although it overlaps something. */
  allowDoubleBooking?: boolean;
}

export interface CurrentEvent {
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
}

export interface ChangePlan {
  eventId: string;
  action: ChangeAction;
  title: string;
  from: { start: Date; end: Date };
  /** Where a move goes; null for a cancel. */
  to: { start: Date; end: Date } | null;
  allowDoubleBooking: boolean;
}

export type PlanResult = { ok: true; plan: ChangePlan } | { ok: false; error: string };

export function buildChangePlan(input: ChangeInput, current: CurrentEvent, ctx: { timeZone: string; now: Date }): PlanResult {
  const eventId = typeof input.eventId === 'string' ? input.eventId.trim() : '';
  if (!FIRESTORE_ID.test(eventId)) return { ok: false, error: 'Say which event. Read the calendar first (getCalendar) and use the id it gives.' };
  const action = oneLine(input.action, 10).toLowerCase();
  if (action !== 'move' && action !== 'cancel') return { ok: false, error: 'The action must be move or cancel.' };

  const base = { eventId, title: current.title, from: { start: current.start, end: current.end }, allowDoubleBooking: input.allowDoubleBooking === true };
  if (action === 'cancel') return { ok: true, plan: { ...base, action, to: null } };

  const startText = oneLine(input.startTime, 40);
  if (!startText) return { ok: false, error: 'To move an event, say the new day and time. Ask the user when it should be.' };
  if (DATE_ONLY.test(startText)) return { ok: false, error: `"${startText}" has no time of day. Ask the user what time it should start.` };
  const start = parseWhenInZone(startText, ctx.timeZone, ctx.now);
  if (!start) return { ok: false, error: `"${startText}" is not a date and time I can use. Send it like 2026-11-10T15:00:00-05:00.` };
  if (start.getTime() < ctx.now.getTime() - PAST_GRACE_MS) return { ok: false, error: 'That time has already passed. Ask the user for a time that is still ahead.' };

  let end: Date;
  const endText = oneLine(input.endTime, 40);
  if (endText) {
    const parsed = parseWhenInZone(endText, ctx.timeZone, ctx.now);
    if (!parsed) return { ok: false, error: `"${endText}" is not an end time I can use.` };
    end = parsed;
  } else if (input.durationMinutes !== undefined && input.durationMinutes !== null) {
    const minutes = Number(input.durationMinutes);
    if (!Number.isFinite(minutes) || minutes < MIN_MINUTES || minutes > MAX_APPOINTMENT_MINUTES) {
      return { ok: false, error: `The length must be between ${MIN_MINUTES} minutes and 12 hours.` };
    }
    end = new Date(start.getTime() + Math.round(minutes) * MINUTE_MS);
  } else {
    const keep = current.allDay ? ALL_DAY_MOVE_MINUTES * MINUTE_MS : current.end.getTime() - current.start.getTime();
    end = new Date(start.getTime() + keep);
  }
  if (end.getTime() <= start.getTime()) return { ok: false, error: 'The end time must be after the start time.' };
  if (Math.round((end.getTime() - start.getTime()) / MINUTE_MS) > MAX_APPOINTMENT_MINUTES * 2) {
    return { ok: false, error: 'That is longer than a day. Check the end time.' };
  }
  if (start.getTime() === current.start.getTime() && end.getTime() === current.end.getTime()) {
    return { ok: false, error: 'It is already at that time, so nothing needs to change.' };
  }
  return { ok: true, plan: { ...base, action, to: { start, end } } };
}

/** What the user is shown. It must keep the sentence "Nothing has changed yet": the server looks for it in the reply. */
export function describePlan(plan: ChangePlan, timeZone: string): string {
  const title = `"${oneLine(plan.title, 80)}"`;
  const was = describeSlot(plan.from.start, plan.from.end, timeZone);
  if (plan.action === 'cancel') return `Ready to cancel ${title} (${was}). Nothing has changed yet.`;
  const to = plan.to as { start: Date; end: Date };
  return `Ready to move ${title} from ${was} to ${describeSlot(to.start, to.end, timeZone)}. Nothing has changed yet.`;
}

export function describeDone(plan: ChangePlan, timeZone: string): string {
  const title = `"${oneLine(plan.title, 80)}"`;
  if (plan.action === 'cancel') return `Cancelled ${title}, which was ${describeSlot(plan.from.start, plan.from.end, timeZone)}. It is gone from your Calendar.`;
  const to = plan.to as { start: Date; end: Date };
  return `Moved ${title} to ${describeSlot(to.start, to.end, timeZone)}. It is on your Calendar at the new time.`;
}
