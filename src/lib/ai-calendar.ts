/**
 * Reading a person's calendar for the AI assistant (pure; see tests/ai-calendar.test.ts).
 *
 * The Calendar shows a task when it is scheduled and has a start and an end (src/components/calendar). The assistant
 * reads the same records, but only the signed-in person's own: an event belongs to the person it is assigned to
 * (`workerId`), or to the person who made it when nobody is assigned. `workerId` holds either a sign-in id or the
 * person's contact id (the app has used both), so both count as "me".
 */
import { oneLine } from '@/lib/ai-input';
import { describeNow, parseWhenInZone, validTimeZone } from '@/lib/ai-time';

export interface CalendarItem {
  /** The record's id, when the rows came with one (`__id`). Never shown to the model. */
  id?: string;
  title: string;
  start: Date;
  end: Date;
  status: string;
  /** Covers a whole day: it sits above the time grid and does not block a time. */
  allDay: boolean;
}

export interface CalendarOwner {
  userId: string;
  contactId?: string | null;
}

const MINUTE_MS = 60_000;
const ALL_DAY_MINUTES = 24 * 60 - 1;

/** A date from whatever Firestore (or a test) holds: a Date, an Admin or client Timestamp, or a date string. */
export function toDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }
  if (value && typeof value === 'object') {
    const raw = value as Record<string, any>;
    if (typeof raw.toDate === 'function') {
      try {
        return toDate(raw.toDate());
      } catch {
        return null;
      }
    }
    const seconds = raw._seconds ?? raw.seconds;
    if (typeof seconds === 'number') {
      const nanos = raw._nanoseconds ?? raw.nanoseconds ?? 0;
      return toDate(new Date(seconds * 1000 + Math.floor(Number(nanos) / 1e6)));
    }
  }
  return null;
}

/** The person's own scheduled, timed events from raw task records, earliest first. */
export function calendarItemsFor(rows: ReadonlyArray<Record<string, any>>, owner: CalendarOwner): CalendarItem[] {
  const own = new Set<string>([owner.userId]);
  if (owner.contactId) own.add(owner.contactId);
  const items: CalendarItem[] = [];
  for (const row of rows) {
    if (!row || !row.isScheduled) continue;
    const start = toDate(row.start);
    const end = toDate(row.end);
    if (!start || !end || end.getTime() <= start.getTime()) continue;
    const assignee = typeof row.workerId === 'string' && row.workerId ? row.workerId : null;
    if (!(assignee ? own.has(assignee) : row.userId === owner.userId)) continue;
    items.push({
      ...(typeof row.__id === 'string' && row.__id ? { id: row.__id } : {}),
      title: oneLine(row.title, 120) || '(untitled)',
      start,
      end,
      status: typeof row.status === 'string' ? row.status : 'todo',
      allDay: (end.getTime() - start.getTime()) / MINUTE_MS >= ALL_DAY_MINUTES,
    });
  }
  return items.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Unfinished timed events that overlap [start, end). Back-to-back events do not overlap. */
export function findConflicts(items: readonly CalendarItem[], start: Date, end: Date): CalendarItem[] {
  return items.filter(
    (item) => !item.allDay && item.status !== 'done' && item.start.getTime() < end.getTime() && start.getTime() < item.end.getTime()
  );
}

/** Events that touch [from, to), including all-day ones. */
export function itemsBetween(items: readonly CalendarItem[], from: Date, to: Date): CalendarItem[] {
  return items.filter((item) => item.start.getTime() < to.getTime() && item.end.getTime() > from.getTime());
}

/** "Tue, Nov 10, 3:00 p.m. to 3:30 p.m." in the person's own time zone. */
export function describeSlot(start: Date, end: Date, timeZone: unknown, allDay = false): string {
  const zone = validTimeZone(timeZone);
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: zone, weekday: 'short', month: 'short', day: 'numeric' }).format(start);
  if (allDay) return `${day}, all day`;
  const time = new Intl.DateTimeFormat('en-CA', { timeZone: zone, hour: 'numeric', minute: '2-digit', hour12: true });
  const plain = (date: Date) => time.format(date).replace(/[\s\u202f]*([ap])\.m\./gi, ' $1m');
  return `${day}, ${plain(start)} to ${plain(end)}`;
}

/** The local date, as YYYY-MM-DD, that `now` falls on in the person's time zone. */
export function localDateOf(now: Date, timeZone: unknown): string {
  return describeNow(timeZone, now).iso.slice(0, 10);
}

/** YYYY-MM-DD plus a whole number of days. Done on the calendar date, so a daylight-saving change cannot shift it. */
export function addDaysToDateString(date: string, days: number): string {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/**
 * The earliest slot of `minutes` that starts no earlier than `from` and fits between my unfinished events inside
 * working hours (9:00 to 17:00 in the PERSON'S time zone; weekdays only, apart from the first day). The shared
 * findNextFreeSlot (used by the Activity Manager form) reads working hours in the computer's own zone, which is the
 * user's in a browser but the server's here, so it cannot be used for this. Returns null when nothing is free.
 */
export function suggestFreeSlot(
  items: readonly CalendarItem[],
  from: Date,
  minutes: number,
  timeZone: unknown,
  now: Date = new Date(),
  maxDaysAhead = 14
): { start: Date; end: Date } | null {
  const zone = validTimeZone(timeZone);
  const stepMs = 5 * MINUTE_MS;
  const ceilToStep = (ms: number) => Math.ceil(ms / stepMs) * stepMs;
  const durationMs = Math.max(5, Math.round(minutes)) * MINUTE_MS;
  const busy = items
    .filter((item) => !item.allDay && item.status !== 'done')
    .map((item) => ({ start: item.start.getTime(), end: item.end.getTime() }))
    .sort((a, b) => a.start - b.start);
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'short' });
  const firstDay = localDateOf(from, zone);

  for (let offset = 0; offset <= maxDaysAhead; offset++) {
    const day = addDaysToDateString(firstDay, offset);
    const open = parseWhenInZone(`${day}T09:00:00`, zone, now);
    const close = parseWhenInZone(`${day}T17:00:00`, zone, now);
    if (!open || !close) continue;
    if (offset > 0 && ['Sat', 'Sun'].includes(weekday.format(open))) continue;

    let cursor = offset === 0 ? Math.max(open.getTime(), ceilToStep(from.getTime())) : open.getTime();
    for (const interval of busy) {
      if (interval.end <= cursor) continue;
      if (interval.start >= cursor + durationMs) break;
      cursor = ceilToStep(interval.end);
    }
    if (cursor + durationMs <= close.getTime()) return { start: new Date(cursor), end: new Date(cursor + durationMs) };
  }
  return null;
}
