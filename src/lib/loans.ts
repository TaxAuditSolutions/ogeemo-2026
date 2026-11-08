/**
 * Loans, equity and the balance sheet (pure; see tests/loans.test.ts).
 *
 * The Financial Snapshot, the Matchbook summary and the loan application all show a balance
 * sheet. They used to work it out separately (and the application read an owner's-equity figure
 * that was never saved anywhere, so it always printed $0). One function now builds it, and
 * Total Liabilities and Equity is worked out so the sheet balances by definition.
 */
import { roundCents } from '@/lib/document-totals';
import { parseLedgerDate } from '@/lib/ledger-date';

export type LoanType = 'payable' | 'receivable';

export interface LoanInput {
  loanType: LoanType;
  originalAmount: string | number;
  outstandingBalance: string | number;
  interestRate?: string | number;
  termMonths?: string | number;
  monthlyPayment?: string | number;
  startDate: string;
  counterparty: string;
}

export interface CleanLoan {
  loanType: LoanType;
  counterparty: string;
  originalAmount: number;
  outstandingBalance: number;
  interestRate: number;
  termMonths: number;
  monthlyPayment: number;
  startDate: string;
}

function money(value: unknown): number | null {
  const text = typeof value === 'string' ? value.replace(/,/g, '').trim() : value;
  if (text === '' || text === null || text === undefined) return null;
  const number = typeof text === 'string' ? parseFloat(text) : Number(text);
  return Number.isFinite(number) ? number : null;
}

/** Why a loan cannot be saved, or the cleaned loan (money to the cent). */
export function validateLoan(input: LoanInput): { error: string } | { error: null; loan: CleanLoan } {
  if (!input.counterparty.trim()) return { error: 'Enter who the loan is with.' };
  const original = money(input.originalAmount);
  const outstanding = money(input.outstandingBalance);
  if (original === null || original <= 0) return { error: 'Enter the original loan amount (more than zero).' };
  if (outstanding === null || outstanding < 0) return { error: 'Enter the outstanding balance (zero or more).' };
  if (outstanding > original + 0.005) return { error: 'The outstanding balance cannot be more than the original amount.' };
  if (!parseLedgerDate(input.startDate)) return { error: 'Choose a valid start date.' };
  const rate = money(input.interestRate) ?? 0;
  if (rate < 0 || rate > 100) return { error: 'The interest rate must be between 0 and 100 percent.' };
  const term = money(input.termMonths) ?? 0;
  if (term < 0 || !Number.isInteger(term)) return { error: 'The term must be a whole number of months.' };
  const payment = money(input.monthlyPayment) ?? 0;
  if (payment < 0) return { error: 'The monthly payment cannot be negative.' };
  return {
    error: null,
    loan: {
      loanType: input.loanType,
      counterparty: input.counterparty.trim(),
      originalAmount: roundCents(original),
      outstandingBalance: roundCents(outstanding),
      interestRate: rate,
      termMonths: term,
      monthlyPayment: roundCents(payment),
      startDate: input.startDate,
    },
  };
}

export interface BalanceSheetInput {
  accountsReceivable: number;
  capitalAssets: number;
  loans: readonly { loanType: LoanType; outstandingBalance: number }[];
  accountsPayable: number;
  payrollLiabilities: number;
  equity: readonly { type: 'contribution' | 'draw'; amount: number }[];
}

export interface BalanceSheet {
  loansReceivable: number;
  loansPayable: number;
  totalAssets: number;
  totalLiabilities: number;
  contributions: number;
  draws: number;
  /** Contributions less draws, as recorded. */
  ownerContributedEquity: number;
  /** What is left once liabilities are taken from assets (the figure to show as owner's equity). */
  netWorth: number;
}

const sum = (values: readonly number[]) => roundCents(values.reduce((total, value) => total + (Number(value) || 0), 0));

export function buildBalanceSheet(input: BalanceSheetInput): BalanceSheet {
  const loansReceivable = sum(input.loans.filter((l) => l.loanType === 'receivable').map((l) => l.outstandingBalance));
  const loansPayable = sum(input.loans.filter((l) => l.loanType === 'payable').map((l) => l.outstandingBalance));
  const totalAssets = roundCents(input.accountsReceivable + input.capitalAssets + loansReceivable);
  const totalLiabilities = roundCents(input.accountsPayable + loansPayable + input.payrollLiabilities);
  const contributions = sum(input.equity.filter((e) => e.type === 'contribution').map((e) => e.amount));
  const draws = sum(input.equity.filter((e) => e.type === 'draw').map((e) => e.amount));
  return {
    loansReceivable,
    loansPayable,
    totalAssets,
    totalLiabilities,
    contributions,
    draws,
    ownerContributedEquity: roundCents(contributions - draws),
    netWorth: roundCents(totalAssets - totalLiabilities),
  };
}

/** Validation for an owner contribution or draw. */
export function validateEquity(form: { date: string; description: string; amount: string | number }): { error: string } | { error: null; amount: number } {
  if (!parseLedgerDate(form.date)) return { error: 'Choose a valid date.' };
  const amount = money(form.amount);
  if (amount === null || amount <= 0) return { error: 'Enter an amount greater than zero.' };
  return { error: null, amount: roundCents(amount) };
}
