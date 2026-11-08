/**
 * Ledger dates (pure; see tests/ledger-date.test.ts).
 *
 * Ledger entries store their date as a plain day, "YYYY-MM-DD". Passing that
 * text to `new Date()` reads it as midnight UTC, which in Canadian time zones is
 * the evening of the day BEFORE. Reports then put an entry dated 1 October in
 * September, and one dated 1 January in the old year's last period. Everything
 * here reads the day as a LOCAL calendar day instead.
 */

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})/;

/** The local calendar day of a stored date (text "YYYY-MM-DD..." or a Date); null when unusable. */
export function parseLedgerDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  if (typeof value !== 'string') return null;
  const match = DAY_RE.exec(value.trim());
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
}

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * True when the entry's day falls on or between the two days (both ends included).
 * With no range every entry is in. With a range, an entry whose date cannot be
 * read is out, so it can never be silently counted in the wrong period.
 */
export function isLedgerDateInRange(value: unknown, from?: Date | null, to?: Date | null): boolean {
  if (!from && !to) return true;
  const day = parseLedgerDate(value);
  if (!day) return false;
  const time = day.getTime();
  if (from && time < startOfLocalDay(from)) return false;
  if (to && time > startOfLocalDay(to)) return false;
  return true;
}

/** Today (or the given moment) as the local "YYYY-MM-DD" day, never the UTC day. */
export function todayDateKey(now: Date = new Date()): string {
  const y = String(now.getFullYear()).padStart(4, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
