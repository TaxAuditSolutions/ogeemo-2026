/**
 * Reading single cells of a bank statement CSV (pure; see tests/bank-csv.test.ts).
 */
import { isValid, parse } from 'date-fns';
import { parseLedgerDate } from '@/lib/ledger-date';
import { roundCents } from '@/lib/document-totals';

export type DateOrder = 'mdy' | 'dmy';

/** Splits one CSV line, honouring quotes and doubled quotes inside them. */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { current += '"'; i++; } else inQuotes = false;
      } else current += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { out.push(current.trim()); current = ''; }
    else current += ch;
  }
  out.push(current.trim());
  return out;
}

/** "$1,234.56", "(12.50)", "-12.50" and "12.50-" are all read; anything else is null (never silently 0). */
export function parseBankAmount(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  const parens = text.startsWith('(') && text.endsWith(')');
  const negative = parens || text.startsWith('-') || text.endsWith('-');
  const cleaned = text.replace(/[$,()\s]/g, '').replace(/^[-+]|-$/g, '');
  if (!/^(\d+\.?\d*|\.\d+)$/.test(cleaned)) return null;
  const number = parseFloat(cleaned);
  if (!Number.isFinite(number)) return null;
  const cents = roundCents(number);
  return negative && cents !== 0 ? -cents : cents;
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const YMD_SLASH_RE = /^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/;
export const PARTS_RE = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/;

function toKey(y: number, m: number, d: number): string | null {
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** A date in a bank file as "YYYY-MM-DD", or null when it is not a real date. */
export function parseBankDate(value: unknown, order: DateOrder = 'mdy'): string | null {
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (ISO_RE.test(text)) return parseLedgerDate(text) ? text : null;
  const ymd = YMD_SLASH_RE.exec(text);
  if (ymd) return toKey(Number(ymd[1]), Number(ymd[2]), Number(ymd[3]));
  const parts = PARTS_RE.exec(text);
  if (parts) {
    const a = Number(parts[1]);
    const b = Number(parts[2]);
    return order === 'mdy' ? toKey(Number(parts[3]), a, b) : toKey(Number(parts[3]), b, a);
  }
  for (const pattern of ['MMM d, yyyy', 'MMMM d, yyyy', 'd MMM yyyy']) {
    const parsed = parse(text, pattern, new Date());
    if (isValid(parsed)) return toKey(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
  }
  return null;
}

/**
 * Works out whether a file's slash dates are month/day or day/month. A part above 12 settles it
 * (25/12/2026 is day first, 12/25/2026 is month first). When every date is ambiguous the default
 * is month/day and the number of ambiguous dates is reported so the user can be warned.
 */
export function detectDateOrder(dates: readonly string[]): { order: DateOrder; ambiguous: number } {
  let dayFirst = 0;
  let monthFirst = 0;
  let ambiguous = 0;
  for (const text of dates) {
    const parts = PARTS_RE.exec(String(text).trim());
    if (!parts) continue;
    const a = Number(parts[1]);
    const b = Number(parts[2]);
    if (a > 12 && b <= 12) dayFirst++;
    else if (b > 12 && a <= 12) monthFirst++;
    else if (a !== b && a <= 12 && b <= 12) ambiguous++;
  }
  if (dayFirst > 0 && monthFirst === 0) return { order: 'dmy', ambiguous: 0 };
  if (monthFirst > 0 && dayFirst === 0) return { order: 'mdy', ambiguous: 0 };
  return { order: 'mdy', ambiguous };
}
