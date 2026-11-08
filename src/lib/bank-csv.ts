/**
 * Whole bank statement CSV reading (pure; see tests/bank-csv.test.ts).
 *
 * Columns, by position: Date, Type, Name, Memo, Amount. Debits are negative.
 * Every row gets an id made from its own content, so uploading the same statement
 * again produces the same ids and rows already reconciled can be recognised.
 */
import {
  detectDateOrder,
  parseBankAmount,
  parseBankDate,
  splitCsvLine,
  type DateOrder,
} from '@/lib/bank-cells';

export { detectDateOrder, parseBankAmount, parseBankDate, splitCsvLine };
export type { DateOrder };

function hash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, '0');
}

/** The id format of a row made by this reader; older ids were random and cannot be matched again. */
export const STABLE_BANK_ID_RE = /^bank_[0-9a-f]{8}$/;

/** Id from the row's own content plus its position among identical rows (two identical coffees stay distinct). */
export function bankRowId(row: { date: string; amount: number; name: string; memo: string }, occurrence: number): string {
  return `bank_${hash(`${row.date}|${Math.round(row.amount * 100)}|${row.name}|${row.memo}|${occurrence}`)}`;
}

export interface ParsedBankRow {
  id: string;
  date: string;
  type: string;
  name: string;
  memo: string;
  amount: number;
}

export interface SkippedBankRow {
  line: number;
  reason: string;
}

export interface ParsedBankCsv {
  rows: ParsedBankRow[];
  skipped: SkippedBankRow[];
  dateOrder: DateOrder;
  ambiguousDates: number;
}

/** Reads a statement. A header line is skipped only when its first cell is not a date. */
export function parseBankCsv(text: string): ParsedBankCsv {
  const cells = text
    .split(/\r?\n/)
    .map((line, index) => ({ number: index + 1, raw: line }))
    .filter((line) => line.raw.trim())
    .map((line) => ({ number: line.number, parts: splitCsvLine(line.raw) }));

  const firstCell = cells[0]?.parts[0];
  const looksLikeHeader = cells.length > 0 && parseBankDate(firstCell, 'mdy') === null && parseBankDate(firstCell, 'dmy') === null;
  const body = looksLikeHeader ? cells.slice(1) : cells;

  const { order, ambiguous } = detectDateOrder(body.map((row) => row.parts[0] ?? ''));
  const rows: ParsedBankRow[] = [];
  const skipped: SkippedBankRow[] = [];
  const seen = new Map<string, number>();

  for (const row of body) {
    const [dateText, type = '', name = '', memo = '', amountText] = row.parts;
    const date = parseBankDate(dateText, order);
    if (!date) { skipped.push({ line: row.number, reason: `Date "${dateText ?? ''}" is not a valid date` }); continue; }
    const amount = parseBankAmount(amountText);
    if (amount === null) { skipped.push({ line: row.number, reason: `Amount "${amountText ?? ''}" is not a number` }); continue; }
    const base = { date, amount, name: name || 'Unknown', memo };
    const key = `${date}|${Math.round(amount * 100)}|${base.name}|${memo}`;
    const occurrence = seen.get(key) ?? 0;
    seen.set(key, occurrence + 1);
    rows.push({ id: bankRowId(base, occurrence), date, type: type || 'N/A', name: base.name, memo, amount });
  }
  return { rows, skipped, dateOrder: order, ambiguousDates: ambiguous };
}
