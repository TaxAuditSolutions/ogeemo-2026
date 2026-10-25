/**
 * Document numbering (pure, test-safe — no Firebase imports).
 *
 * Format: {PREFIX}-{YYYYMMDD}-{sequence}
 *   e.g. QTE-20261023-001 · INV-20261023-014 · REC-20261023-001 · WO-20261023-003
 *
 * - The date segment is the BUSINESS (local) date, so each day starts a fresh
 *   per-type sequence — no annual-reset machinery exists by design.
 * - Counters live per org, per type, per day (see numbering-actions.ts) and are
 *   claimed server-side at SAVE time; overrides are uniqueness-checked and never
 *   consume a counter slot unless they equal the current next number.
 */

export type DocumentNumberType = 'INV' | 'QTE' | 'REC' | 'WO';

export const DOCUMENT_NUMBER_TYPES: readonly DocumentNumberType[] = ['INV', 'QTE', 'REC', 'WO'];

export interface NumberingRule {
  /** Document prefix, e.g. INV. Kept verbatim on the number. */
  prefix: string;
  /** Zero-pad width of the daily sequence (3 -> 001). Clamped to 3..6. */
  padding: number;
}

export type NumberingConfig = Partial<Record<DocumentNumberType, NumberingRule>>;

export const DEFAULT_NUMBERING: Record<DocumentNumberType, NumberingRule> = {
  INV: { prefix: 'INV', padding: 3 },
  QTE: { prefix: 'QTE', padding: 3 },
  REC: { prefix: 'REC', padding: 3 },
  WO: { prefix: 'WO', padding: 3 },
};

/** Field on the owning document that stores the number. */
export const NUMBERING_DOC_FIELDS: Record<DocumentNumberType, string> = {
  INV: 'invoiceNumber',
  QTE: 'quoteNumber',
  REC: 'receiptNumber',
  WO: 'workOrderNumber',
};

/** Firestore collection that holds documents of each type. */
export const NUMBERING_COLLECTIONS: Record<DocumentNumberType, string> = {
  INV: 'invoices',
  QTE: 'quotes',
  REC: 'incomeTransactions',
  WO: 'workOrders',
};

const PREFIX_RE = /^[A-Za-z0-9][A-Za-z0-9-]{0,15}$/;

/** Bounds for a user-entered "next number" (Settings counter steering). */
export const MIN_COUNTER_NEXT = 1;
export const MAX_COUNTER_NEXT = 999999;

/** A counter's "next number" must be a whole number within bounds. */
export function isValidCounterNext(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_COUNTER_NEXT && value <= MAX_COUNTER_NEXT;
}

/**
 * Counter doc value that makes `nextValue` the next claimed number.
 * claimDocumentNumber increments before formatting, so the stored value is
 * nextValue - 1 (clamped at 0, which is what "restart at 001" writes).
 */
export function counterValueForNext(nextValue: number): number {
  return Math.max(0, Math.trunc(nextValue) - 1);
}

export function isDocumentNumberType(value: string): value is DocumentNumberType {
  return (DOCUMENT_NUMBER_TYPES as readonly string[]).includes(value);
}

/** Local business date as YYYYMMDD (never UTC — evenings must not roll tomorrow). */
export function formatBusinessDate(d: Date = new Date()): string {
  const y = String(d.getFullYear()).padStart(4, '0');
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

export function isValidBusinessDate(value: string): boolean {
  return /^\d{8}$/.test(value);
}

/** Clamps/validates a stored rule against a fallback (defaults for legacy orgs). */
export function normalizeRule(rule: Partial<NumberingRule> | undefined | null, fallback: NumberingRule): NumberingRule {
  const prefix = typeof rule?.prefix === 'string' ? rule.prefix.trim() : '';
  const paddingRaw = Number(rule?.padding);
  return {
    prefix: PREFIX_RE.test(prefix) ? prefix : fallback.prefix,
    padding: Number.isFinite(paddingRaw) ? Math.min(6, Math.max(3, Math.trunc(paddingRaw))) : fallback.padding,
  };
}

/** Builds the full number. Sequence grows past padding naturally (1000 stays 1000). */
export function formatDocumentNumber(
  type: DocumentNumberType,
  rule: NumberingRule,
  businessDate: string,
  sequence: number
): string {
  const seq = Math.max(1, Math.trunc(sequence));
  return `${rule.prefix}-${businessDate}-${String(seq).padStart(rule.padding, '0')}`;
}

/** Counter doc id inside organizations/{orgId}/counters. */
export function counterDocId(type: DocumentNumberType, businessDate: string): string {
  return `${type}_${businessDate}`;
}

export type OverrideValidation =
  | { ok: true; value: string }
  | { ok: false; error: string };

/**
 * Exceptions are allowed: an overridden number does NOT have to match the
 * default format, but it must be a sane, non-empty single-line string.
 */
export function validateOverrideNumber(raw: string): OverrideValidation {
  const value = (raw || '').trim();
  if (!value) return { ok: false, error: 'Document number cannot be empty.' };
  if (/[\r\n\t]/.test(value)) return { ok: false, error: 'Document number cannot contain line breaks.' };
  if (value.length > 40) return { ok: false, error: 'Document number must be 40 characters or fewer.' };
  return { ok: true, value };
}
