/**
 * Reading quotes for the AI assistant (pure; see tests/ai-quotes.test.ts).
 *
 * Statuses and the "needs attention" counts follow the Quote Manager (src/components/accounting/quotes-page-view.tsx):
 * a quote is stale when it has sat in Sent for 14 days or more, waiting when it is Approved but not yet converted, and
 * expiring when it is still Requested, Draft or Sent and expires within the next 7 days. Days are calendar days in the
 * USER's time zone. Only the fields a question needs leave this file.
 */
import { localDateOf, toDate } from '@/lib/ai-calendar';
import { oneLine } from '@/lib/ai-input';
import { roundCents } from '@/lib/document-totals';

const DAY_MS = 86_400_000;
const STALE_DAYS = 14;
const EXPIRING_DAYS = 7;

export const QUOTE_STATUSES = ['requested', 'draft', 'sent', 'approved', 'declined', 'invoiced', 'in_progress', 'completed', 'paid'] as const;
export type QuoteFilterStatus = (typeof QUOTE_STATUSES)[number] | 'open' | 'all';

/** Quotes still being worked towards a yes: nothing decided, converted or paid yet. */
const OPEN = new Set(['requested', 'draft', 'sent', 'approved']);
const BEFORE_APPROVAL = new Set(['requested', 'draft', 'sent']);

const dayOf = (value: unknown, timeZone: unknown): string | null => {
  const date = toDate(value);
  return date ? localDateOf(date, timeZone) : null;
};
const daysBetween = (from: string, to: string): number => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);

export interface QuoteRow {
  number: string;
  client: string;
  contactId: string | null;
  quoteDay: string | null;
  expiryDay: string | null;
  total: number;
  status: string;
  /** Days since the last change while in Sent; null otherwise. */
  daysInSent: number | null;
  /** Days until it expires (negative once past) for a quote not yet approved; null otherwise. */
  daysToExpiry: number | null;
  needsAttention: boolean;
  reason: string | null;
}

export function rowFromQuote(data: Record<string, any>, timeZone: unknown, now: Date): QuoteRow {
  const status = typeof data.status === 'string' ? data.status : 'draft';
  const today = localDateOf(now, timeZone);
  const expiryDay = dayOf(data.expirationDate, timeZone);
  const changedDay = dayOf(data.updatedAt, timeZone);

  const daysInSent = status === 'sent' && changedDay ? daysBetween(changedDay, today) : null;
  const daysToExpiry = BEFORE_APPROVAL.has(status) && expiryDay ? daysBetween(today, expiryDay) : null;

  let reason: string | null = null;
  if (daysInSent !== null && daysInSent >= STALE_DAYS) reason = `sent ${daysInSent} days ago with no change`;
  else if (status === 'approved') reason = 'approved but not yet invoiced or turned into a work order';
  else if (daysToExpiry !== null && daysToExpiry >= 0 && daysToExpiry <= EXPIRING_DAYS) {
    reason = daysToExpiry === 0 ? 'expires today' : `expires in ${daysToExpiry} day${daysToExpiry === 1 ? '' : 's'}`;
  }

  return {
    number: oneLine(data.quoteNumber, 40) || '(no number)',
    client: oneLine(data.companyName, 80) || 'Unknown client',
    contactId: typeof data.contactId === 'string' && data.contactId ? data.contactId : null,
    quoteDay: dayOf(data.quoteDate, timeZone),
    expiryDay,
    total: roundCents(typeof data.totalAmount === 'number' && Number.isFinite(data.totalAmount) ? data.totalAmount : 0),
    status,
    daysInSent,
    daysToExpiry,
    needsAttention: reason !== null,
    reason,
  };
}

export interface QuoteFilter {
  status?: QuoteFilterStatus;
  contactId?: string | null;
  /** Part of a quote number; case does not matter. */
  number?: string | null;
  needsAttention?: boolean;
}

export function filterQuotes(rows: readonly QuoteRow[], filter: QuoteFilter = {}): QuoteRow[] {
  const status = filter.status ?? 'open';
  return rows
    .filter((row) => {
      if (filter.contactId && row.contactId !== filter.contactId) return false;
      if (filter.number && !row.number.toLowerCase().includes(filter.number.toLowerCase())) return false;
      if (filter.needsAttention && !row.needsAttention) return false;
      if (status === 'all') return true;
      if (status === 'open') return OPEN.has(row.status);
      return row.status === status;
    })
    .sort((a, b) => (b.quoteDay ?? '').localeCompare(a.quoteDay ?? '') || b.number.localeCompare(a.number));
}

export interface QuoteTotals {
  count: number;
  total: number;
  byStatus: Array<{ status: string; count: number; total: number }>;
  needsAttention: number;
}

export function summarizeQuotes(rows: readonly QuoteRow[]): QuoteTotals {
  const by = new Map<string, { count: number; total: number }>();
  let total = 0;
  let attention = 0;
  for (const row of rows) {
    total += row.total;
    if (row.needsAttention) attention += 1;
    const slot = by.get(row.status) ?? { count: 0, total: 0 };
    slot.count += 1;
    slot.total += row.total;
    by.set(row.status, slot);
  }
  const order = (status: string) => {
    const index = (QUOTE_STATUSES as readonly string[]).indexOf(status);
    return index === -1 ? QUOTE_STATUSES.length : index;
  };
  return {
    count: rows.length,
    total: roundCents(total),
    byStatus: [...by.entries()]
      .map(([status, slot]) => ({ status, count: slot.count, total: roundCents(slot.total) }))
      .sort((a, b) => order(a.status) - order(b.status)),
    needsAttention: attention,
  };
}
