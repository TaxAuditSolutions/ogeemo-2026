/**
 * Next free calendar slot (pure; see tests/next-free-slot.test.ts).
 *
 * Used by the Activity Manager form so a new activity opens with a sensible
 * time already filled in: the first gap in the user's calendar, inside working
 * hours, that is long enough for the activity.
 */
import { addDays, set, startOfDay } from 'date-fns';
import type { Event } from '@/types/calendar-types';

/** Default working day. Weekdays only, apart from today, which is always allowed. */
export const WORK_START_HOUR = 9;
export const WORK_END_HOUR = 17;
export const DEFAULT_SLOT_MINUTES = 30;
export const SLOT_STEP_MINUTES = 5;

export type SlotEvent = Pick<Event, 'start' | 'end' | 'isScheduled' | 'status'>;

export interface NextFreeSlotInput {
  /** The calendar to search (already narrowed to the person whose time it is). */
  events: SlotEvent[];
  now: Date;
  durationMinutes?: number;
  workStartHour?: number;
  workEndHour?: number;
  stepMinutes?: number;
  /** How many days past today to look before giving up. */
  maxDaysAhead?: number;
}

export interface FreeSlot {
  start: Date;
  end: Date;
}

const MINUTE_MS = 60_000;
const ALL_DAY_MINUTES = 24 * 60 - 1;

function ceilToStep(date: Date, stepMinutes: number): Date {
  const stepMs = stepMinutes * MINUTE_MS;
  return new Date(Math.ceil(date.getTime() / stepMs) * stepMs);
}

/** Timed, scheduled, unfinished events as sorted [start, end] millisecond pairs. */
function busyIntervals(events: SlotEvent[]): { start: number; end: number }[] {
  const busy: { start: number; end: number }[] = [];
  for (const event of events) {
    if (!event.isScheduled || !event.start || !event.end) continue;
    if (event.status === 'done') continue;
    const start = new Date(event.start).getTime();
    const end = new Date(event.end).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    // All-day items sit above the time grid and do not occupy a slot.
    if ((end - start) / MINUTE_MS >= ALL_DAY_MINUTES) continue;
    busy.push({ start, end });
  }
  return busy.sort((a, b) => a.start - b.start);
}

/**
 * The earliest slot of `durationMinutes` that starts no earlier than now and
 * fits between events inside working hours. Today is searched first (from the
 * next step boundary), then each following weekday. Returns null when nothing
 * is free within `maxDaysAhead`.
 */
export function findNextFreeSlot(input: NextFreeSlotInput): FreeSlot | null {
  const {
    events,
    now,
    workStartHour = WORK_START_HOUR,
    workEndHour = WORK_END_HOUR,
    stepMinutes = SLOT_STEP_MINUTES,
    maxDaysAhead = 14,
  } = input;
  const durationMinutes = Math.max(stepMinutes, input.durationMinutes ?? DEFAULT_SLOT_MINUTES);
  const durationMs = durationMinutes * MINUTE_MS;
  const busy = busyIntervals(events);

  for (let offset = 0; offset <= maxDaysAhead; offset++) {
    const day = addDays(startOfDay(now), offset);
    if (offset > 0 && (day.getDay() === 0 || day.getDay() === 6)) continue;

    const open = set(day, { hours: workStartHour, minutes: 0, seconds: 0, milliseconds: 0 });
    const close = set(day, { hours: workEndHour, minutes: 0, seconds: 0, milliseconds: 0 });

    let cursor = offset === 0 && now.getTime() > open.getTime() ? ceilToStep(now, stepMinutes).getTime() : open.getTime();
    for (const interval of busy) {
      if (interval.end <= cursor) continue; // already over
      if (interval.start >= cursor + durationMs) break; // the gap before it is big enough
      cursor = ceilToStep(new Date(interval.end), stepMinutes).getTime();
    }

    if (cursor + durationMs <= close.getTime()) {
      return { start: new Date(cursor), end: new Date(cursor + durationMs) };
    }
  }
  return null;
}

/** 30 -> "30 min", 60 -> "1 hr", 90 -> "1 hr 30 min". */
export function formatDurationMinutes(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}
