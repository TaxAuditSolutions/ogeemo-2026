/**
 * Invoice balance, status, overdue and payment rules, and quote conversion
 * rules (pure; see tests/invoice-status.test.ts).
 *
 * "Overdue" is worked out from the due date and the balance each time it is
 * needed. It is never stored, so it cannot go stale: an invoice becomes overdue
 * the day after it is due and stops being overdue the moment it is paid.
 */
import { roundCents } from '@/lib/document-totals';

/** Statuses that are stored on an invoice. 'overdue' is shown, never saved. */
export type StoredInvoiceStatus = 'draft' | 'outstanding' | 'partially_paid' | 'paid';

const PAID_TOLERANCE = 0.01;

export function invoiceBalance(originalAmount: number, amountPaid: number): number {
  return Math.max(0, roundCents((Number(originalAmount) || 0) - (Number(amountPaid) || 0)));
}

export function isFullyPaid(originalAmount: number, amountPaid: number): boolean {
  const paid = Number(amountPaid) || 0;
  return paid > 0 && paid >= (Number(originalAmount) || 0) - PAID_TOLERANCE;
}

/**
 * The status an invoice should be saved with, from its amounts alone. Used on
 * every save, so editing the total of a paid invoice upward correctly makes it
 * partially paid instead of leaving it marked Paid.
 */
export function storedStatusFor(originalAmount: number, amountPaid: number): Exclude<StoredInvoiceStatus, 'draft'> {
  if (isFullyPaid(originalAmount, amountPaid)) return 'paid';
  return (Number(amountPaid) || 0) > 0 ? 'partially_paid' : 'outstanding';
}

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** True when money is still owed and the due date was before today (due today is not overdue). */
export function isInvoiceOverdue(
  invoice: { originalAmount: number; amountPaid: number; dueDate: Date | string | number; status?: string },
  now: Date = new Date()
): boolean {
  if (invoice.status === 'draft' || invoice.status === 'paid') return false;
  if (invoiceBalance(invoice.originalAmount, invoice.amountPaid) <= PAID_TOLERANCE) return false;
  const due = new Date(invoice.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  return startOfLocalDay(due) < startOfLocalDay(now);
}

/** Whole days past the due date (0 when not overdue). */
export function daysOverdue(
  invoice: { originalAmount: number; amountPaid: number; dueDate: Date | string | number; status?: string },
  now: Date = new Date()
): number {
  if (!isInvoiceOverdue(invoice, now)) return 0;
  return Math.round((startOfLocalDay(now) - startOfLocalDay(new Date(invoice.dueDate))) / 86_400_000);
}

/** The status to show people: stored status, or 'overdue' when it is late. */
export function displayStatus(
  invoice: { originalAmount: number; amountPaid: number; dueDate: Date | string | number; status: string },
  now: Date = new Date()
): string {
  return isInvoiceOverdue(invoice, now) ? 'overdue' : invoice.status;
}

/** Why a payment cannot be posted, or null when it can. */
export function validatePaymentAmount(amount: number, originalAmount: number, amountPaid: number): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return 'Enter a payment amount greater than zero.';
  const balance = invoiceBalance(originalAmount, amountPaid);
  if (balance <= PAID_TOLERANCE) return 'This invoice is already paid in full.';
  if (roundCents(amount) > balance + PAID_TOLERANCE) {
    return `The payment is more than the balance due of ${balance.toFixed(2)}. Enter ${balance.toFixed(2)} or less.`;
  }
  return null;
}

/** Adds a payment to the amount paid, to the cent. */
export function addPayment(amountPaid: number, payment: number): number {
  return roundCents((Number(amountPaid) || 0) + roundCents(payment));
}

export type ConvertTarget = 'invoice' | 'work order';

/** Why a quote cannot be converted, or null when it can. */
export function quoteConversionProblem(
  status: string,
  target: ConvertTarget,
  options: { hasWorkOrder?: boolean } = {}
): string | null {
  if (status === 'declined') return `A declined quote cannot be turned into a ${target}. Reopen it first.`;
  if (status === 'invoiced' || status === 'paid') {
    return `This quote has already been invoiced, so it cannot be turned into a ${target} again. Open the existing invoice instead.`;
  }
  if (target === 'work order' && (status === 'in_progress' || options.hasWorkOrder)) {
    return 'This quote already has a work order. Open it from the Work Orders list.';
  }
  return null;
}
