/**
 * Loan payments (pure; see tests/loan-payments.test.ts).
 *
 * A payment has two parts. The PRINCIPAL lowers what is owed; the INTEREST is the cost of
 * borrowing, so it is the only part that reaches the Income Statement (an expense on money
 * you owe, income on money owed to you). Recording a payment lowers the outstanding balance
 * by its principal, and removing one puts that principal back.
 */
import { roundCents } from '@/lib/document-totals';
import { parseLedgerDate } from '@/lib/ledger-date';

export interface LoanPayment {
  id: string;
  /** The day paid, "YYYY-MM-DD". */
  date: string;
  principal: number;
  interest: number;
  note?: string;
  /** The ledger entry made for the interest, so deleting the payment can remove it. */
  ledgerEntryId?: string | null;
}

const PAID_OFF_TOLERANCE = 0.005;

/** Interest for one month on the balance, to the cent: balance x annual rate / 12. */
export function suggestMonthlyInterest(balance: number, annualRatePercent: number): number {
  if (!(balance > 0) || !(annualRatePercent > 0)) return 0;
  return roundCents((balance * annualRatePercent) / 100 / 12);
}

export function isPaidOff(balance: number): boolean {
  return !(Number(balance) > PAID_OFF_TOLERANCE);
}

export interface PaymentInput {
  balance: number;
  date: string;
  /** The whole amount paid (principal plus interest). */
  total: string | number;
  interest: string | number;
}

function money(value: unknown): number | null {
  const text = typeof value === 'string' ? value.replace(/,/g, '').trim() : value;
  if (text === '' || text === null || text === undefined) return null;
  const number = typeof text === 'string' ? parseFloat(text) : Number(text);
  return Number.isFinite(number) ? number : null;
}

/** Why a payment cannot be recorded, or its principal and interest split. */
export function validateLoanPayment(input: PaymentInput): { error: string } | { error: null; principal: number; interest: number; total: number } {
  if (isPaidOff(input.balance)) return { error: 'This loan is already paid off.' };
  if (!parseLedgerDate(input.date)) return { error: 'Choose the date the payment was made.' };
  const total = money(input.total);
  if (total === null || total <= 0) return { error: 'Enter the amount paid (more than zero).' };
  const interest = money(input.interest) ?? 0;
  if (interest < 0) return { error: 'Interest cannot be negative.' };
  const roundedTotal = roundCents(total);
  const roundedInterest = roundCents(interest);
  if (roundedInterest > roundedTotal) return { error: 'The interest cannot be more than the amount paid.' };
  const principal = roundCents(roundedTotal - roundedInterest);
  if (principal > roundCents(input.balance) + PAID_OFF_TOLERANCE) {
    return {
      error: `That pays ${principal.toFixed(2)} of principal but only ${roundCents(input.balance).toFixed(2)} is owing. Pay at most ${roundCents(input.balance + roundedInterest).toFixed(2)} including this interest.`,
    };
  }
  return { error: null, principal, interest: roundedInterest, total: roundedTotal };
}

export interface LoanState {
  outstandingBalance: number;
  payments?: readonly LoanPayment[];
}

/** The loan after a payment: balance down by the principal, payment added (kept in date order). */
export function applyLoanPayment(loan: LoanState, payment: LoanPayment): { outstandingBalance: number; payments: LoanPayment[] } {
  const payments = [...(loan.payments ?? []), payment].sort((a, b) => a.date.localeCompare(b.date));
  return { outstandingBalance: Math.max(0, roundCents(loan.outstandingBalance - payment.principal)), payments };
}

/** The loan after a payment is removed: its principal goes back, never above the original amount. */
export function removeLoanPayment(
  loan: LoanState & { originalAmount: number },
  paymentId: string
): { outstandingBalance: number; payments: LoanPayment[]; removed: LoanPayment | null } {
  const removed = (loan.payments ?? []).find((p) => p.id === paymentId) ?? null;
  if (!removed) return { outstandingBalance: loan.outstandingBalance, payments: [...(loan.payments ?? [])], removed: null };
  return {
    outstandingBalance: Math.min(roundCents(loan.originalAmount), roundCents(loan.outstandingBalance + removed.principal)),
    payments: (loan.payments ?? []).filter((p) => p.id !== paymentId),
    removed,
  };
}

/** Totals of what has been paid so far. */
export function paymentTotals(payments: readonly LoanPayment[] | undefined): { principal: number; interest: number; total: number } {
  let principal = 0;
  let interest = 0;
  for (const p of payments ?? []) {
    principal += Number(p.principal) || 0;
    interest += Number(p.interest) || 0;
  }
  return { principal: roundCents(principal), interest: roundCents(interest), total: roundCents(principal + interest) };
}
