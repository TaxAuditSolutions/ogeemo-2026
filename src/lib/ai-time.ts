/**
 * Dates and time zones for the AI assistant (pure; see tests/ai-time.test.ts).
 *
 * The model used to be given no date and no time zone, so "schedule it tomorrow" could not be answered, and a
 * time without an offset was read in the server's zone (UTC on the host), not the user's. The prompt now carries
 * the user's current local time with its UTC offset, and a time the model sends without an offset is read in the
 * user's zone.
 */

/** The zone name if the runtime knows it, otherwise UTC (a bad name from a browser must not crash a request). */
export function validTimeZone(value: unknown): string {
  if (typeof value !== 'string') return 'UTC';
  const zone = value.trim();
  if (!zone || zone.length > 64) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return zone;
  } catch {
    return 'UTC';
  }
}

/** +05:30 / -04:00 for an offset in minutes. */
export function offsetString(offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? '-' : '+';
  const abs = Math.abs(Math.round(offsetMinutes));
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

export interface ZoneNow {
  /** Local date and time with the UTC offset, e.g. 2026-11-09T12:27:20-05:00 */
  iso: string;
  weekday: string;
  offsetMinutes: number;
  timeZone: string;
}

export function describeNow(timeZone: unknown, now: Date = new Date()): ZoneNow {
  const zone = validTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23', weekday: 'long', timeZoneName: 'longOffset',
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  const match = /GMT([+-])(\d{1,2})(?::?(\d{2}))?/.exec(get('timeZoneName'));
  const offsetMinutes = match ? (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3] ?? 0)) : 0;
  return {
    iso: `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}${offsetString(offsetMinutes)}`,
    weekday: get('weekday'),
    offsetMinutes,
    timeZone: zone,
  };
}

/**
 * Reads a date or date-time the model sent. A value with an offset or Z keeps it; a value without one is read in
 * the user's zone (`offsetMinutes`); a bare date means the start of that day. Anything else, an impossible date
 * such as 2026-02-31, or a year outside 2000-2100 returns null.
 */
export function parseWhen(value: unknown, offsetMinutes: number): Date | null {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text || text.length > 40) return null;
  const withTime = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?/;
  let candidate: string;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    candidate = `${text}T00:00:00${offsetString(offsetMinutes)}`;
  } else if (new RegExp(withTime.source + '$').test(text)) {
    candidate = text.replace(' ', 'T') + offsetString(offsetMinutes);
  } else if (new RegExp(withTime.source + '(Z|[+-]\\d{2}:?\\d{2})$', 'i').test(text)) {
    candidate = text.replace(' ', 'T').replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
  } else {
    return null;
  }
  const date = new Date(candidate);
  if (Number.isNaN(date.getTime())) return null;
  // Date quietly rolls 2026-02-31 over to March 3, so check the day that was written really exists.
  const [y, m, d] = text.slice(0, 10).split('-').map(Number);
  const real = new Date(Date.UTC(y, m - 1, d));
  if (real.getUTCFullYear() !== y || real.getUTCMonth() !== m - 1 || real.getUTCDate() !== d) return null;
  const year = date.getUTCFullYear();
  return year >= 2000 && year <= 2100 ? date : null;
}

/**
 * Like parseWhen, but a time with no offset is read in the named zone using the offset that zone has ON THAT DATE
 * (so a July meeting set in January is not an hour out because of daylight saving).
 */
export function parseWhenInZone(value: unknown, timeZone: unknown, now: Date = new Date()): Date | null {
  const zone = validTimeZone(timeZone);
  const first = parseWhen(value, describeNow(zone, now).offsetMinutes);
  if (!first) return null;
  const there = describeNow(zone, first).offsetMinutes;
  if (there === describeNow(zone, now).offsetMinutes) return first;
  return parseWhen(value, there);
}
