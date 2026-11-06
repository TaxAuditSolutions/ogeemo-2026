import { getAdminDb, getAdminStorage } from '@/core/firebase-admin';
import { detectReceiptMime, type ReceiptMimeType } from '@/lib/receipt-file-utils';
import { isValidStorageId } from '@/lib/receipt-storage-utils';

/**
 * Server-only access to stored receipt files. Every read is checked against the
 * caller's workspace, so one workspace can never read another's receipts.
 */

export const RECEIPT_QUEUE_COLLECTION = 'receiptStagingQueue';

export type StoredReceiptResult =
  | { ok: true; bytes: Uint8Array; mimeType: ReceiptMimeType; storagePath: string }
  | { ok: false; status: number; error: string };

export async function readStoredReceipt(orgId: string, receiptId: unknown): Promise<StoredReceiptResult> {
  if (!isValidStorageId(receiptId)) return { ok: false, status: 400, error: 'A valid receipt id is required.' };

  const db = getAdminDb();
  const storage = getAdminStorage();
  if (!db || !storage) return { ok: false, status: 503, error: 'The server is not configured for receipt storage.' };

  const snap = await db.collection(RECEIPT_QUEUE_COLLECTION).doc(receiptId).get();
  if (!snap.exists || snap.data()?.orgId !== orgId) return { ok: false, status: 404, error: 'Receipt not found.' };

  const storagePath = typeof snap.data()?.storagePath === 'string' ? (snap.data()?.storagePath as string) : '';
  // Defense in depth: a stored path must belong to this workspace and receipt.
  if (!storagePath.startsWith(`receipts/${orgId}/${receiptId}/`)) {
    return { ok: false, status: 404, error: 'No stored file for this receipt.' };
  }

  const file = storage.bucket().file(storagePath);
  const [exists] = await file.exists();
  if (!exists) return { ok: false, status: 404, error: 'The stored file could not be found.' };

  const [contents] = await file.download();
  const bytes = new Uint8Array(contents);
  const mimeType = detectReceiptMime(bytes);
  if (!mimeType) return { ok: false, status: 415, error: 'The stored file is not a supported receipt type.' };
  return { ok: true, bytes, mimeType, storagePath };
}
