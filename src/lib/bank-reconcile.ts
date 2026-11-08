/**
 * Matching bank rows to the books (pure; see tests/bank-reconcile.test.ts).
 *
 * Rules:
 *  - Direction must agree: money in matches income and invoices, money out matches expenses and bills.
 *    (Without this a $100 withdrawal could be matched to a $100 invoice and posted as a payment received.)
 *  - The amount must agree to the cent. The date must be the same day (perfect) or within a few days (drift).
 *  - One book entry is matched to at most one bank row, and exact-date matches are settled before
 *    near-date ones so a drift match never takes an entry a later row matches exactly.
 *  - A row that was already reconciled in an earlier session is reported as a duplicate and never matched
 *    or ingested again.
 */
import { STABLE_BANK_ID_RE } from '@/lib/bank-csv';
import { parseLedgerDate } from '@/lib/ledger-date';

export type MatchStatus = 'perfect' | 'drift' | 'unmatched' | 'duplicate';

export interface BankRowInput {
  id: string;
  date: string;
  amount: number;
}

export interface RegistryEntry {
  id: string;
  date: string;
  amount: number;
  direction: 'in' | 'out';
  isReconciled?: boolean;
  bankReferenceId?: string;
}

export interface BankMatch {
  bankId: string;
  status: MatchStatus;
  registryId?: string;
  /** Days the book entry is after (+) or before (-) the bank date. */
  driftDays?: number;
}

const cents = (value: number) => Math.round((Number(value) || 0) * 100);

function dayNumber(text: string): number | null {
  const day = parseLedgerDate(text);
  return day ? Math.round(day.getTime() / 86_400_000 - day.getTimezoneOffset() / 1440) : null;
}

export function matchBankTransactions(
  bank: readonly BankRowInput[],
  registry: readonly RegistryEntry[],
  options: { driftDays?: number } = {}
): BankMatch[] {
  const maxDrift = options.driftDays ?? 7;
  const results: BankMatch[] = bank.map((row) => ({ bankId: row.id, status: 'unmatched' as MatchStatus }));
  const direction = (row: BankRowInput) => (row.amount > 0 ? 'in' : row.amount < 0 ? 'out' : null);

  // 1. Rows already reconciled before: by the stable id on the book entry, or, for entries made before ids were
  //    stable, by counting reconciled entries with the same direction, amount and date.
  const reconciledIds = new Set(registry.filter((e) => e.isReconciled && e.bankReferenceId).map((e) => e.bankReferenceId as string));
  const legacyBudget = new Map<string, number>();
  for (const entry of registry) {
    if (!entry.isReconciled || (entry.bankReferenceId && STABLE_BANK_ID_RE.test(entry.bankReferenceId))) continue;
    const key = `${entry.direction}|${cents(entry.amount)}|${entry.date}`;
    legacyBudget.set(key, (legacyBudget.get(key) ?? 0) + 1);
  }
  bank.forEach((row, i) => {
    const dir = direction(row);
    if (!dir) return;
    if (reconciledIds.has(row.id)) { results[i].status = 'duplicate'; return; }
    const key = `${dir}|${cents(Math.abs(row.amount))}|${row.date}`;
    const left = legacyBudget.get(key) ?? 0;
    if (left > 0) { legacyBudget.set(key, left - 1); results[i].status = 'duplicate'; }
  });

  // 2. Match the rest: exact day first, then near days.
  const open = registry.filter((e) => !e.isReconciled);
  const used = new Set<string>();
  const candidatesFor = (row: BankRowInput) => {
    const dir = direction(row);
    return dir ? open.filter((e) => !used.has(e.id) && e.direction === dir && cents(e.amount) === cents(Math.abs(row.amount))) : [];
  };

  bank.forEach((row, i) => {
    if (results[i].status !== 'unmatched') return;
    const found = candidatesFor(row).find((e) => e.date === row.date);
    if (found) { used.add(found.id); results[i] = { bankId: row.id, status: 'perfect', registryId: found.id, driftDays: 0 }; }
  });

  bank.forEach((row, i) => {
    if (results[i].status !== 'unmatched') return;
    const bankDay = dayNumber(row.date);
    if (bankDay === null) return;
    let best: { entry: RegistryEntry; diff: number } | null = null;
    for (const entry of candidatesFor(row)) {
      const entryDay = dayNumber(entry.date);
      if (entryDay === null) continue;
      const diff = entryDay - bankDay;
      if (Math.abs(diff) > maxDrift) continue;
      if (!best || Math.abs(diff) < Math.abs(best.diff)) best = { entry, diff };
    }
    if (best) { used.add(best.entry.id); results[i] = { bankId: row.id, status: 'drift', registryId: best.entry.id, driftDays: best.diff }; }
  });

  return results;
}
