/**
 * Rows uploaded on the Bank Statements screen (pure; see tests/bank-statement-rows.test.ts).
 *
 * Every row id comes from the row's own content (lib/bank-csv), so uploading the same statement to
 * the same account again produces the same ids and the rows are recognised instead of doubled. The
 * same statement uploaded to a different account is a different record and is kept.
 */
import type { ParsedBankRow } from '@/lib/bank-csv';

export interface StatementRow {
  id: string;
  accountId: string;
  date: string;
  transactionType: string;
  name: string;
  memo: string;
  amount: number;
}

/** A parsed CSV row as a row of one account. */
export function toStatementRow(row: ParsedBankRow, accountId: string): StatementRow {
  return {
    id: row.id,
    accountId,
    date: row.date,
    transactionType: row.type || 'N/A',
    name: row.name || 'Unknown',
    memo: row.memo,
    amount: row.amount,
  };
}

/** Adds the incoming rows that are not already there for the same account, newest upload first. */
export function mergeStatementRows<T extends { id: string; accountId: string }>(
  existing: readonly T[],
  incoming: readonly T[]
): { merged: T[]; added: number; duplicates: number } {
  const seen = new Set(existing.map((row) => `${row.accountId}|${row.id}`));
  const fresh: T[] = [];
  let duplicates = 0;
  for (const row of incoming) {
    const key = `${row.accountId}|${row.id}`;
    if (seen.has(key)) {
      duplicates += 1;
      continue;
    }
    seen.add(key);
    fresh.push(row);
  }
  return { merged: [...fresh, ...existing], added: fresh.length, duplicates };
}

/** The sentence under the "Statement read" message: what was added, skipped and unclear. */
export function uploadSummary(
  parsed: { rows: readonly unknown[]; skipped: readonly { line: number; reason: string }[]; ambiguousDates: number },
  result: { added: number; duplicates: number }
): string {
  const parts = [`Added ${result.added} transaction${result.added === 1 ? '' : 's'}.`];
  if (result.duplicates > 0) parts.push(`${result.duplicates} already uploaded for this account ${result.duplicates === 1 ? 'was' : 'were'} not added again.`);
  if (parsed.skipped.length > 0) {
    parts.push(`${parsed.skipped.length} row${parsed.skipped.length === 1 ? '' : 's'} skipped (first: line ${parsed.skipped[0].line}, ${parsed.skipped[0].reason}).`);
  }
  if (parsed.ambiguousDates > 0) {
    parts.push(`${parsed.ambiguousDates} date${parsed.ambiguousDates === 1 ? ' is' : 's are'} ambiguous and read as month/day.`);
  }
  return parts.join(' ');
}
