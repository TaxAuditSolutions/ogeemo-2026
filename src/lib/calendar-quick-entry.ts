/**
 * Calendar quick entries (pure; see tests/calendar-quick-entry.test.ts).
 *
 * A quick entry is a one-line note typed straight into a calendar time slot: a to-do,
 * an appointment or any other thing the user wants to see in their day. It is saved as
 * an ordinary scheduled task, so it can be dragged around the calendar and opened in the
 * Activity Manager whenever it needs more than one line.
 */
import type { Event } from '@/types/calendar-types';

export const MAX_QUICK_TITLE = 200;

const MINUTE_MS = 60_000;
/** A span this long (a whole day less a minute) is an all-day item, matching the calendar's all-day row. */
const ALL_DAY_MINUTES = 24 * 60 - 1;

/** One tidy line of text: whitespace collapsed, trimmed and limited in length. */
export function cleanQuickTitle(raw: string): string {
  return String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_QUICK_TITLE).trim();
}

function validDate(value: unknown): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime());
}

/** True for items that cover a whole day (they live in the all-day row, not in a time slot). */
export function isAllDaySpan(start?: Date, end?: Date): boolean {
  if (!validDate(start) || !validDate(end)) return false;
  return (end.getTime() - start.getTime()) / MINUTE_MS >= ALL_DAY_MINUTES;
}

/**
 * The task to save for a quick entry, or null when there is nothing valid to save.
 * It has no logged time (duration 0), so it is planned time only and never counts as
 * worked or billable time in reports.
 */
export function buildQuickEntry(input: {
  title: string;
  start: Date;
  end: Date;
  userId: string;
}): Omit<Event, 'id'> | null {
  const title = cleanQuickTitle(input.title);
  if (!title || !input.userId) return null;
  if (!validDate(input.start) || !validDate(input.end) || input.end.getTime() <= input.start.getTime()) return null;
  return {
    title,
    description: '',
    start: input.start,
    end: input.end,
    status: 'todo',
    position: 0,
    userId: input.userId,
    isScheduled: true,
    isTodoItem: true,
    activityType: 'task',
    duration: 0,
  };
}

/**
 * Start and end for an item dropped on a time slot. A timed item keeps its length. An all-day
 * item, or one with no usable length, takes the length of the slot it lands in.
 */
export function droppedTimes(
  item: { start?: Date; end?: Date },
  slotStart: Date,
  slotMinutes: number
): { start: Date; end: Date } {
  const fallback = Math.max(1, Math.round(slotMinutes) || 30);
  let minutes = fallback;
  if (validDate(item.start) && validDate(item.end) && !isAllDaySpan(item.start, item.end)) {
    const span = (item.end.getTime() - item.start.getTime()) / MINUTE_MS;
    if (span > 0) minutes = span;
  }
  return { start: slotStart, end: new Date(slotStart.getTime() + minutes * MINUTE_MS) };
}

/**
 * True for a planned item whose time has passed without being completed, so it can be shown
 * as needing to be moved forward. Appointments and planning rituals are never flagged: they
 * happen at a time and are not "completed".
 */
export function isOverdue(
  event: Pick<Event, 'status' | 'end' | 'activityType' | 'ritualType'>,
  now: Date
): boolean {
  if (event.status === 'done') return false;
  if (event.activityType === 'appointment' || event.ritualType) return false;
  if (!validDate(event.end)) return false;
  return event.end.getTime() < now.getTime();
}
