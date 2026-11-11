/**
 * A range of days the assistant was asked about (pure; see tests/ai-range.test.ts).
 *
 * The model sends YYYY-MM-DD days. They are read in the USER's time zone (the server runs in UTC, the user does not),
 * and the range is [start of `from`, start of the day after `to`), so the last day is included whole. `to` is today
 * when only `from` is given; with neither, the range is open.
 */
import { addDaysToDateString, localDateOf } from '@/lib/ai-calendar';
import { parseWhenInZone } from '@/lib/ai-time';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export interface DayRange {
  from: Date | null;
  to: Date | null;
}

/** The range, or a message the model can act on when the dates are not usable. */
export function readDayRange(fromText: string, toText: string, timeZone: unknown, now: Date): DayRange | string {
  for (const [label, value] of [['from', fromText], ['to', toText]] as const) {
    if (value && !DAY.test(value)) return `The "${label}" date must be YYYY-MM-DD, for example 2026-11-01.`;
  }
  let from: Date | null = null;
  let to: Date | null = null;
  if (fromText) {
    from = parseWhenInZone(fromText, timeZone, now);
    to = parseWhenInZone(addDaysToDateString(toText || localDateOf(now, timeZone), 1), timeZone, now);
    if (!from || !to) return 'That date range is not one I can use. Give dates as YYYY-MM-DD.';
    if (to.getTime() <= from.getTime()) return 'The "to" date must not be before the "from" date.';
  } else if (toText) {
    to = parseWhenInZone(addDaysToDateString(toText, 1), timeZone, now);
    if (!to) return 'That date is not one I can use. Give it as YYYY-MM-DD.';
  }
  return { from, to };
}

export interface DayStrings {
  /** First day, YYYY-MM-DD, or null when open. */
  from: string | null;
  /** Last day, inclusive, YYYY-MM-DD, or null when open. */
  to: string | null;
}

function isRealDay(value: string): boolean {
  if (!DAY.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/**
 * The same range as whole calendar days (no moments), for records that are kept by their calendar day, such as an
 * invoice date. `to` is today (in the user's zone) when only `from` is given. A message when the dates are unusable.
 */
export function readDayStrings(fromText: string, toText: string, timeZone: unknown, now: Date): DayStrings | string {
  for (const [label, value] of [['from', fromText], ['to', toText]] as const) {
    if (value && !isRealDay(value)) return `The "${label}" date must be a real date as YYYY-MM-DD, for example 2026-11-01.`;
  }
  const from = fromText || null;
  const to = toText || (from ? localDateOf(now, timeZone) : null);
  if (from && to && to < from) return 'The "to" date must not be before the "from" date.';
  return { from, to };
}
