/**
 * Cash on hand (pure; see tests/cash-balance.test.ts).
 *
 * An account's cash is its opening balance (what it held on its opening date) plus every deposit
 * to it and less every payment from it dated after that. Ledger entries name the account they
 * used (depositedTo / paidFrom) either by its registry name or its id, so both are matched.
 *
 * Some entries name no registry account at all ("Cash / Default", "Bank Account", "Petty Cash
 * Box"). Those cannot be pinned to one account, so they are reported separately as UNASSIGNED
 * rather than guessed at or dropped.
 */
import { roundCents } from '@/lib/document-totals';
import { isBusinessEntry } from '@/lib/ledger-totals';
import { parseLedgerDate } from '@/lib/ledger-date';

export interface CashAccount {
  id: string;
  name: string;
  type?: 'Bank' | 'Credit Card' | 'Cash' | 'Other';
  businessType?: 'Business' | 'Personal';
  /** What the account held on openingBalanceDate. */
  openingBalance?: number;
  openingBalanceDate?: string;
}

export interface CashEntry {
  date: string;
  totalAmount: number;
  type?: string | null;
  depositedTo?: string;
  paidFrom?: string;
}

/** Names that mean "some cash, no particular account". */
const GENERIC_NAMES = new Set(['cash / default', 'bank account', 'cash account', 'petty cash box', 'default', '']);

export const PETTY_CASH_NAME = 'petty cash box';

const norm = (value: string | undefined) => (value ?? '').trim().toLowerCase();

export interface AccountBalance {
  account: CashAccount;
  moneyIn: number;
  moneyOut: number;
  balance: number;
  /** Entries dated before the opening date are already inside the opening balance and are not counted again. */
  entriesCounted: number;
}

export interface CashSummary {
  accounts: AccountBalance[];
  /** Cash in and out on entries that named no registry account. */
  unassigned: { moneyIn: number; moneyOut: number; net: number; count: number };
  /** Petty cash box float (cash in less cash out entries posted to it). */
  pettyCash: number;
  /** Bank and cash accounts only (credit cards are a liability, handled apart). */
  totalCash: number;
  /** Credit card balances owing (never negative). */
  creditCardOwing: number;
}

function counts(entry: CashEntry, opening: string | undefined): boolean {
  if (!isBusinessEntry(entry)) return false;
  if (!opening) return true;
  const day = parseLedgerDate(entry.date);
  const from = parseLedgerDate(opening);
  if (!day || !from) return true;
  return day.getTime() >= from.getTime();
}

export function summarizeCash(
  accounts: readonly CashAccount[],
  income: readonly CashEntry[],
  expenses: readonly CashEntry[]
): CashSummary {
  const byKey = new Map<string, CashAccount>();
  for (const account of accounts) {
    byKey.set(norm(account.name), account);
    byKey.set(norm(account.id), account);
  }

  const totals = new Map<string, { moneyIn: number; moneyOut: number; counted: number }>();
  for (const account of accounts) totals.set(account.id, { moneyIn: 0, moneyOut: 0, counted: 0 });
  let unassignedIn = 0;
  let unassignedOut = 0;
  let unassignedCount = 0;
  let pettyIn = 0;
  let pettyOut = 0;

  const place = (key: string | undefined, entry: CashEntry, direction: 'in' | 'out') => {
    const amount = Number(entry.totalAmount) || 0;
    const name = norm(key);
    const account = byKey.get(name);
    if (!account) {
      if (name === PETTY_CASH_NAME) {
        if (isBusinessEntry(entry)) direction === 'in' ? (pettyIn += amount) : (pettyOut += amount);
        return;
      }
      if (!isBusinessEntry(entry)) return;
      if (GENERIC_NAMES.has(name) || name) {
        direction === 'in' ? (unassignedIn += amount) : (unassignedOut += amount);
        unassignedCount += 1;
      }
      return;
    }
    if (!counts(entry, account.openingBalanceDate)) return;
    const bucket = totals.get(account.id)!;
    direction === 'in' ? (bucket.moneyIn += amount) : (bucket.moneyOut += amount);
    bucket.counted += 1;
  };

  for (const entry of income) place(entry.depositedTo, entry, 'in');
  for (const entry of expenses) place(entry.paidFrom, entry, 'out');

  const balances: AccountBalance[] = accounts.map((account) => {
    const bucket = totals.get(account.id)!;
    const moneyIn = roundCents(bucket.moneyIn);
    const moneyOut = roundCents(bucket.moneyOut);
    return {
      account,
      moneyIn,
      moneyOut,
      balance: roundCents((Number(account.openingBalance) || 0) + moneyIn - moneyOut),
      entriesCounted: bucket.counted,
    };
  });

  const isCard = (b: AccountBalance) => b.account.type === 'Credit Card';
  const business = (b: AccountBalance) => b.account.businessType !== 'Personal';
  const cash = balances.filter((b) => !isCard(b) && business(b));
  const cards = balances.filter((b) => isCard(b) && business(b));

  return {
    accounts: balances,
    unassigned: {
      moneyIn: roundCents(unassignedIn),
      moneyOut: roundCents(unassignedOut),
      net: roundCents(unassignedIn - unassignedOut),
      count: unassignedCount,
    },
    pettyCash: roundCents(pettyIn - pettyOut),
    totalCash: roundCents(cash.reduce((sum, b) => sum + b.balance, 0)),
    // A card's "balance" here is its signed cash movement; what is owing is the negative of it, never below zero.
    creditCardOwing: roundCents(cards.reduce((sum, b) => sum + Math.max(0, -b.balance), 0)),
  };
}

/** Checks the opening balance fields of the account form. Both blank means no opening balance is set. */
export function checkOpeningBalance(amountText: string, dateText: string): { error: string; amount: null; date: null } | { error: null; amount: number | null; date: string | undefined } {
  const amountBlank = amountText.trim() === '';
  const dateBlank = dateText.trim() === '';
  if (amountBlank && dateBlank) return { error: null, amount: null, date: undefined };
  if (amountBlank) return { error: 'Enter the opening balance, or clear the date.', amount: null, date: null };
  const amount = parseFloat(amountText.replace(/,/g, ''));
  if (!Number.isFinite(amount)) return { error: 'The opening balance must be a number.', amount: null, date: null };
  if (dateBlank || !parseLedgerDate(dateText)) return { error: 'Choose the date the opening balance was true.', amount: null, date: null };
  return { error: null, amount: roundCents(amount), date: dateText };
}

