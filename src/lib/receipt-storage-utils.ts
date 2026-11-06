import type { ReceiptMimeType } from '@/lib/receipt-file-utils';

/**
 * Pure helpers for permanent receipt storage (no Firebase imports, so they can
 * be unit-tested; see tests/receipt-storage-utils.test.ts).
 *
 * Files live in the Firebase Storage bucket at
 *   receipts/{orgId}/{receiptId}/{file name}
 * and are only ever read or written through the authenticated
 * /api/receipts/files route - storage.rules deny all direct client access.
 */

const ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

const EXTENSIONS: Record<ReceiptMimeType, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export function isValidStorageId(value: unknown): value is string {
  return typeof value === 'string' && ID_RE.test(value);
}

/** A safe single path segment for the stored file, always with the right extension. */
export function safeReceiptFileName(name: string | undefined | null, mimeType: ReceiptMimeType): string {
  const extension = EXTENSIONS[mimeType];
  const base = (name ?? '').split(/[/\\]/).pop() ?? '';
  const withoutExtension = base.replace(/\.[A-Za-z0-9]{1,5}$/, '');
  const cleaned = withoutExtension
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[._-]+/, '')
    .replace(/[._-]+$/, '')
    .slice(0, 80);
  return `${cleaned || 'receipt'}.${extension}`;
}

export function receiptStoragePath(orgId: string, receiptId: string, fileName: string, mimeType: ReceiptMimeType): string {
  if (!isValidStorageId(orgId)) throw new Error('A valid workspace id is required.');
  if (!isValidStorageId(receiptId)) throw new Error('A valid receipt id is required.');
  return `receipts/${orgId}/${receiptId}/${safeReceiptFileName(fileName, mimeType)}`;
}

/** Stable, same-origin link to a stored receipt (served only to signed-in members of the workspace). */
export function receiptFileUrl(receiptId: string): string {
  return `/api/receipts/files?receiptId=${encodeURIComponent(receiptId)}`;
}
