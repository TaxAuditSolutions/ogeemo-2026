import { format } from 'date-fns';
import { isScheduledPlaceholder } from '@/lib/duration-source';

/**
 * Billing-state primitives for the Time Log -> Invoice workflow
 * (OG-070 eligibility rules, OG-071 lifecycle groundwork).
 *
 * One normalized entry shape covers both underlying record types:
 * - 'log'  -> TimeLog docs (timeLogs collection: manual / field-app logs)
 * - 'event' -> Event/Task docs (tasks collection: Activity Manager sessions)
 *
 * Invoicing reads and writes THESE records (via sourceEntryId/sourceEntryType
 * on invoice line items) - never a copy - so both workflow directions see
 * the same state. See docs/time-billing-model.md.
 */
export type BillingEntrySource = 'log' | 'event';

/** Cross-collection reference to a billable record. */
export interface EntryRef {
  id: string;
  source: BillingEntrySource;
}

/** Minimal shape of an entry as offered for invoicing, from either collection. */
export interface InvoiceableEntry {
  id: string;
  source: BillingEntrySource;
  contactId: string | null;
  title: string;
  description?: string;
  startTime: Date | null;
  durationSeconds: number;
  isBillable: boolean;
  billableRate: number;
  /** True when duration is only a planned schedule span (never invoiceable). */
  scheduledOnly: boolean;
  /** Set once the entry has been placed on an invoice (duplicate-billing guard). */
  billedInvoiceId?: string | null;
}

/** Stable set-comparison key for entry refs. */
export function entryRefKey(ref: EntryRef): string {
  return `${ref.source}:${ref.id}`;
}

/**
 * OG-070 eligibility: only unbilled, actually-worked, billable time with a
 * client attached may be offered through Create/Add to Invoice.
 */
export function isEligibleForBilling(
  entry: Pick<InvoiceableEntry, 'isBillable' | 'durationSeconds' | 'contactId' | 'scheduledOnly' | 'billedInvoiceId'>
): boolean {
  return (
    entry.isBillable &&
    entry.durationSeconds > 0 &&
    !!entry.contactId &&
    !entry.scheduledOnly &&
    !entry.billedInvoiceId
  );
}

/** True when an entry would be eligible except that it is already invoiced. */
export function isInvoiced(
  entry: Pick<InvoiceableEntry, 'isBillable' | 'durationSeconds' | 'contactId' | 'scheduledOnly' | 'billedInvoiceId'>
): boolean {
  return (
    entry.isBillable &&
    entry.durationSeconds > 0 &&
    !!entry.contactId &&
    !entry.scheduledOnly &&
    !!entry.billedInvoiceId
  );
}

/**
 * Invoice-line mapping shared by the invoice and quote generators, so
 * "Add from Time Log" and the Time Log -> Invoice handoff produce identical
 * line items that point back at the source record.
 */
export function toInvoiceLineItem(
  entry: InvoiceableEntry,
  index: number,
  nowMs: number = Date.now()
): {
  id: string;
  description: string;
  internalNotes: string;
  categoryNumber: string;
  quantity: number;
  price: number;
  sourceEntryId: string;
  sourceEntryType: BillingEntrySource;
} {
  return {
    id: `time_${nowMs}_${index}`,
    description: `${entry.title} - ${entry.startTime ? format(entry.startTime, 'PPP') : 'N/A'}`,
    internalNotes: entry.description || '',
    categoryNumber: '',
    quantity: parseFloat((entry.durationSeconds / 3600).toFixed(2)),
    price: entry.billableRate || 0,
    sourceEntryId: entry.id,
    sourceEntryType: entry.source,
  };
}

/**
 * Reconciles the source refs of an invoice's OLD line items vs its NEW line
 * items (invoice edit): entries to stamp (added) and to unstamp (removed).
 * Kept refs need no write.
 */
export function reconcileSourceRefs(
  oldRefs: EntryRef[],
  newRefs: EntryRef[]
): { toStamp: EntryRef[]; toUnstamp: EntryRef[] } {
  const oldKeys = new Set(oldRefs.map(entryRefKey));
  const newKeys = new Set(newRefs.map(entryRefKey));
  return {
    toStamp: newRefs.filter((r) => !oldKeys.has(entryRefKey(r))),
    toUnstamp: oldRefs.filter((r) => !newKeys.has(entryRefKey(r))),
  };
}

/** Collects the source refs carried by persisted invoice line items. */
export function sourceRefsFromLineItems(
  lineItems: ReadonlyArray<{
    sourceEntryId?: string | null;
    sourceEntryType?: string | null;
    [key: string]: unknown;
  }>
): EntryRef[] {
  return lineItems
    .filter((item): item is { sourceEntryId: string; sourceEntryType: BillingEntrySource } =>
      !!item.sourceEntryId && (item.sourceEntryType === 'log' || item.sourceEntryType === 'event')
    )
    .map((item) => ({ id: item.sourceEntryId, source: item.sourceEntryType }));
}
