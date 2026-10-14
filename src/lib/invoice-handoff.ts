import type { EntryRef, BillingEntrySource } from '@/lib/billing-eligibility';

/**
 * Read-once handoff of "bill these entries for this client" from the Time Log
 * Report into the Invoice Generator (sessionStorage: per-tab, no URL-length
 * limits). The reader removes the payload after reading, so a stale handoff
 * can never re-apply itself on refresh or a later visit.
 */
const HANDOFF_KEY = 'invoiceDraftHandoff';
const HANDOFF_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface InvoiceDraftHandoff {
  contactId: string;
  entryRefs: EntryRef[];
  createdAt: number;
}

function defaultStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null; // storage blocked (privacy mode etc.) - handoff is best-effort
  }
}

export function writeInvoiceDraftHandoff(
  data: { contactId: string; entryRefs: EntryRef[] },
  storage: Storage | null = defaultStorage()
): void {
  if (!storage || !data.contactId || data.entryRefs.length === 0) return;
  const payload: InvoiceDraftHandoff = { ...data, createdAt: Date.now() };
  storage.setItem(HANDOFF_KEY, JSON.stringify(payload));
}

/** Read once: the payload is removed before returning. Null when absent/stale/invalid. */
export function readInvoiceDraftHandoff(
  storage: Storage | null = defaultStorage()
): InvoiceDraftHandoff | null {
  if (!storage) return null;
  const raw = storage.getItem(HANDOFF_KEY);
  if (!raw) return null;
  storage.removeItem(HANDOFF_KEY);
  try {
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed.contactId !== 'string' ||
      !parsed.contactId ||
      !Array.isArray(parsed.entryRefs) ||
      parsed.entryRefs.length === 0 ||
      typeof parsed.createdAt !== 'number' ||
      Date.now() - parsed.createdAt > HANDOFF_TTL_MS
    ) {
      return null;
    }
    const entryRefs: EntryRef[] = parsed.entryRefs.filter(
      (r: any): r is EntryRef =>
        !!r &&
        typeof r.id === 'string' &&
        !!r.id &&
        (r.source === 'log' || r.source === ('event' as BillingEntrySource))
    );
    if (entryRefs.length === 0) return null;
    return { contactId: parsed.contactId, entryRefs, createdAt: parsed.createdAt };
  } catch {
    return null;
  }
}

export function discardInvoiceDraftHandoff(storage: Storage | null = defaultStorage()): void {
  storage?.removeItem(HANDOFF_KEY);
}
