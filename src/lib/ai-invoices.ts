/**
 * Reading invoices and quotes for the AI assistant (pure; see tests/ai-invoices.test.ts).
 *
 * The balance, paid and overdue rules are the ones Accounts Receivable uses (src/lib/invoice-status.ts), with one
 * difference that matters on a server: "overdue" there compares the due date with today on the machine's own clock
 * (right in a browser, wrong on a UTC server). Here both days are worked out in the USER's time zone, so an invoice
 * is overdue the day after its due date for the person asking, whatever the server's clock says.
 *
 * Only the fields a question needs leave this file: no notes, business numbers, addresses or line items.
 */
import { invoiceBalance, isFullyPaid, storedStatusFor } from '@/lib/invoice-status';
import { localDateOf, toDate } from '@/lib/ai-calendar';
import { oneLine } from '@/lib/ai-input';
import { roundCents } from '@/lib/document-totals';

const PAID_TOLERANCE = 0.01;
const DAY_MS = 86_400_000;

const money = (value: unknown): number => roundCents(typeof value === 'number' && Number.isFinite(value) ? value : 0);
const dayOf = (value: unknown, timeZone: unknown): string | null => {
  const date = toDate(value);
  return date ? localDateOf(date, timeZone) : null;
};
const daysBetween = (from: string, to: string): number => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);

export type InvoiceFilterStatus = 'outstanding' | 'overdue' | 'paid' | 'draft' | 'all';

export interface InvoiceRow {
  number: string;
  client: string;
  contactId: string | null;
  invoiceDay: string | null;
  dueDay: string | null;
  total: number;
  paid: number;
  balance: number;
  /** draft, outstanding, partially_paid, paid, or overdue (worked out, never stored). */
  status: string;
  daysOverdue: number;
}

export function rowFromInvoice(data: Record<string, any>, timeZone: unknown, now: Date): InvoiceRow {
  const total = money(data.originalAmount);
  const paid = money(data.amountPaid);
  const balance = invoiceBalance(total, paid);
  const stored = typeof data.status === 'string' ? data.status : '';
  const dueDay = dayOf(data.dueDate, timeZone);
  const today = localDateOf(now, timeZone);
  const late = stored !== 'draft' && stored !== 'paid' && balance > PAID_TOLERANCE && dueDay !== null && dueDay < today;
  return {
    number: oneLine(data.invoiceNumber, 40) || '(no number)',
    client: oneLine(data.companyName, 80) || 'Unknown client',
    contactId: typeof data.contactId === 'string' && data.contactId ? data.contactId : null,
    invoiceDay: dayOf(data.invoiceDate, timeZone),
    dueDay,
    total,
    paid,
    balance,
    status: stored === 'draft' ? 'draft' : late ? 'overdue' : storedStatusFor(total, paid),
    daysOverdue: late && dueDay ? daysBetween(dueDay, today) : 0,
  };
}

export interface InvoiceFilter {
  status?: InvoiceFilterStatus;
  contactId?: string | null;
  /** Part of an invoice number, such as "INV-1042"; case does not matter. */
  number?: string | null;
  /** Invoice date range as calendar days in the user's zone, inclusive. */
  fromDay?: string | null;
  toDay?: string | null;
}

/** The rows the Accounts Receivable rules would show for the filter. Drafts only when asked for. */
export function filterInvoices(rows: readonly InvoiceRow[], filter: InvoiceFilter = {}): InvoiceRow[] {
  const status = filter.status ?? 'outstanding';
  const kept = rows.filter((row) => {
    if (filter.contactId && row.contactId !== filter.contactId) return false;
    if (filter.number && !row.number.toLowerCase().includes(filter.number.toLowerCase())) return false;
    if (filter.fromDay || filter.toDay) {
      if (!row.invoiceDay) return false;
      if (filter.fromDay && row.invoiceDay < filter.fromDay) return false;
      if (filter.toDay && row.invoiceDay > filter.toDay) return false;
    }
    if (status === 'draft') return row.status === 'draft';
    if (row.status === 'draft') return false;
    if (status === 'outstanding') return row.balance > PAID_TOLERANCE;
    if (status === 'overdue') return row.status === 'overdue';
    if (status === 'paid') return row.balance <= PAID_TOLERANCE && isFullyPaid(row.total, row.paid);
    return true;
  });
  const owed = status === 'outstanding' || status === 'overdue';
  return kept.sort((a, b) =>
    owed
      ? (a.dueDay ?? '9999').localeCompare(b.dueDay ?? '9999') || a.number.localeCompare(b.number)
      : (b.invoiceDay ?? '').localeCompare(a.invoiceDay ?? '') || b.number.localeCompare(a.number)
  );
}

export interface InvoiceTotals {
  count: number;
  total: number;
  paid: number;
  balance: number;
  overdueCount: number;
  overdueBalance: number;
}

export function summarizeInvoices(rows: readonly InvoiceRow[]): InvoiceTotals {
  let total = 0;
  let paid = 0;
  let balance = 0;
  let overdueCount = 0;
  let overdueBalance = 0;
  for (const row of rows) {
    total += row.total;
    paid += row.paid;
    balance += row.balance;
    if (row.status === 'overdue') {
      overdueCount += 1;
      overdueBalance += row.balance;
    }
  }
  return { count: rows.length, total: money(total), paid: money(paid), balance: money(balance), overdueCount, overdueBalance: money(overdueBalance) };
}
