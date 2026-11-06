/**
 * Pure helpers for the receipt review queue (no React/Firebase imports so they
 * can be unit-tested; see tests/receipt-queue-utils.test.ts).
 */

/** Drops repeated ids, keeping the first occurrence and the original order. */
export function dedupeById<T extends { id: string }>(items: readonly T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }
  return result;
}

/**
 * Merges freshly loaded/updated items into the current queue by id.
 * Incoming items replace existing ones in place; genuinely new items are
 * placed first. The result never contains a duplicate id, so it is safe to
 * use `id` as a React key.
 */
export function mergeQueueItems<T extends { id: string }>(current: readonly T[], incoming: readonly T[]): T[] {
  const latest = new Map<string, T>();
  incoming.forEach((item) => latest.set(item.id, item));

  const currentIds = new Set(current.map((item) => item.id));
  const added = dedupeById(incoming).filter((item) => !currentIds.has(item.id)).map((item) => latest.get(item.id) as T);
  const updated = current.map((item) => latest.get(item.id) ?? item);

  return dedupeById([...added, ...updated]);
}

export interface OcrQueueItemState {
  status: 'queued' | 'processing' | 'reviewed' | 'posted' | 'rejected';
  ocrStatus?: 'completed' | 'failed';
}

/** Only unprocessed queued receipts are included in an explicit OCR run. */
export function isReceiptEligibleForOcr(item: OcrQueueItemState): boolean {
  return item.status === 'queued' && item.ocrStatus !== 'completed';
}

export function getOcrEligibleItems<T extends OcrQueueItemState>(items: readonly T[]): T[] {
  return items.filter(isReceiptEligibleForOcr);
}

export interface ReceiptQueueVisibilityState {
  status: OcrQueueItemState['status'];
  /** Legacy bundled fixture identifier. */
  demoReceiptId?: string;
  /** Legacy marker retained only to distinguish old samples from real uploads. */
  isDemo?: boolean;
  fileHash?: string;
}

/** Hides posted/rejected items and legacy samples without hiding real uploaded files. */
export function isVisibleReceiptQueueItem(item: ReceiptQueueVisibilityState): boolean {
  if (item.status === 'posted' || item.status === 'rejected') return false;
  if (item.demoReceiptId) return false;
  return !(item.isDemo && !item.fileHash);
}
