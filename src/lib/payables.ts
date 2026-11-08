/**
 * Bills and payroll remittances (pure; see tests/payables.test.ts).
 *
 * Due dates are plain days ("2026-11-01"). They are read as LOCAL days, so a bill due on the
 * 1st does not show as the 31st, and "overdue" starts the day after the due date.
 */
import { roundCents } from '@/lib/document-totals';
import { parseLedgerDate } from '@/lib/ledger-date';

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Whole days past a plain-day due date (0 when due today, in the future, or unreadable). */
export function daysPastDue(dueDay: unknown, now: Date = new Date()): number {
  const due = parseLedgerDate(dueDay);
  if (!due) return 0;
  const diff = Math.round((startOfLocalDay(now) - due.getTime()) / 86_400_000);
  return diff > 0 ? diff : 0;
}

export function isPastDue(dueDay: unknown, now: Date = new Date()): boolean {
  return daysPastDue(dueDay, now) > 0;
}

export interface RemittanceLike {
  amount: number;
  status: 'Due' | 'Paid';
  dueDate: string;
  paidDate?: string;
}

export interface RemittanceSummary {
  /** Paid during the given calendar year, by the day it was paid. */
  remittedThisYear: number;
  /** Everything still owing. */
  amountDue: number;
  /** Part of the amount due whose deadline has passed. */
  overdueAmount: number;
  overdueCount: number;
}

export function summarizeRemittances(items: readonly RemittanceLike[], now: Date = new Date()): RemittanceSummary {
  const year = now.getFullYear();
  let remitted = 0;
  let due = 0;
  let overdue = 0;
  let overdueCount = 0;
  for (const item of items) {
    const amount = Number(item.amount) || 0;
    if (item.status === 'Paid') {
      const paid = parseLedgerDate(item.paidDate);
      if (paid && paid.getFullYear() === year) remitted += amount;
    } else {
      due += amount;
      if (isPastDue(item.dueDate, now)) { overdue += amount; overdueCount += 1; }
    }
  }
  return { remittedThisYear: roundCents(remitted), amountDue: roundCents(due), overdueAmount: roundCents(overdue), overdueCount };
}

export interface RemittanceForm {
  payPeriodStart: string;
  payPeriodEnd: string;
  dueDate: string;
  amount: string | number;
}

/** Why a remittance cannot be saved, or null. The amount is returned to the cent when it can. */
export function validateRemittance(form: RemittanceForm): { error: string } | { amount: number; error: null } {
  const start = parseLedgerDate(form.payPeriodStart);
  const end = parseLedgerDate(form.payPeriodEnd);
  const due = parseLedgerDate(form.dueDate);
  if (!start || !end || !due) return { error: 'Choose the pay period start and end and the due date.' };
  if (end.getTime() < start.getTime()) return { error: 'The pay period end cannot be before its start.' };
  if (due.getTime() < start.getTime()) return { error: 'The due date cannot be before the pay period starts.' };
  const amount = typeof form.amount === 'string' ? parseFloat(form.amount.replace(/,/g, '')) : Number(form.amount);
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'Enter an amount greater than zero.' };
  return { amount: roundCents(amount), error: null };
}

/** True when a remittance with the same period and amount already exists (a likely double entry). */
export function isDuplicateRemittance(
  items: readonly (RemittanceForm & { amount: number | string })[],
  candidate: { payPeriodStart: string; payPeriodEnd: string; amount: number }
): boolean {
  return items.some(
    (item) =>
      item.payPeriodStart === candidate.payPeriodStart &&
      item.payPeriodEnd === candidate.payPeriodEnd &&
      Math.round((Number(item.amount) || 0) * 100) === Math.round(candidate.amount * 100)
  );
}

/** Day shown to people for a plain-day string; falls back to the text when unreadable. */
export function displayDay(day: unknown, formatter: (date: Date) => string): string {
  const parsed = parseLedgerDate(day);
  return parsed ? formatter(parsed) : String(day ?? '');
}
