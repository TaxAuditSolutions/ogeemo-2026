import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminStorage } from '@/core/firebase-admin';
import { detectReceiptMime } from '@/lib/receipt-file-utils';
import { maxReceiptFileBytes } from '@/lib/receipt-ocr-settings';
import { getReceiptRequestContext, loadReceiptOcrSettings } from '@/lib/receipt-server-auth';
import { RECEIPT_QUEUE_COLLECTION, readStoredReceipt } from '@/lib/receipt-server-storage';
import { isValidStorageId, receiptStoragePath } from '@/lib/receipt-storage-utils';

export const runtime = 'nodejs';

/**
 * Private receipt file store.
 *
 *  PUT  ?receiptId=...   raw bytes -> stored at receipts/{orgId}/{receiptId}/...
 *  GET  ?receiptId=...   streams the stored file to a signed-in member of the same workspace
 *
 * The workspace always comes from the verified session, never from the request,
 * and storage.rules deny direct client access, so this route is the only door.
 */

function json(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

async function loadQueueDoc(receiptId: string, orgId: string) {
  const db = getAdminDb();
  if (!db) return { error: json('The server is not configured for receipt storage.', 503) } as const;
  const snap = await db.collection(RECEIPT_QUEUE_COLLECTION).doc(receiptId).get();
  if (!snap.exists || snap.data()?.orgId !== orgId) {
    return { error: json('Receipt not found.', 404) } as const;
  }
  return { ref: snap.ref, data: snap.data() ?? {} } as const;
}

export async function PUT(req: NextRequest) {
  const context = await getReceiptRequestContext();
  if (!context) return json('Unauthorized: Access Denied.', 401);
  if (!context.canWrite) return json('You do not have permission to store receipts.', 403);

  const receiptId = req.nextUrl.searchParams.get('receiptId');
  if (!isValidStorageId(receiptId)) return json('A valid receipt id is required.', 400);

  const loaded = await loadQueueDoc(receiptId, context.orgId);
  if ('error' in loaded) return loaded.error;

  const settings = await loadReceiptOcrSettings(context.orgId);
  const limit = maxReceiptFileBytes(settings);
  const declared = Number(req.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > limit) {
    return json(`The file is larger than ${settings.maxFileSizeMB} MB.`, 413);
  }

  const bytes = new Uint8Array(await req.arrayBuffer());
  if (bytes.byteLength === 0) return json('The file is empty.', 400);
  if (bytes.byteLength > limit) return json(`The file is larger than ${settings.maxFileSizeMB} MB.`, 413);

  // The file's own bytes decide the type; the declared Content-Type is never trusted.
  const mimeType = detectReceiptMime(bytes);
  if (!mimeType) return json('Unsupported file. Use a PDF, PNG, JPEG, or WebP receipt.', 415);

  const storage = getAdminStorage();
  if (!storage) return json('The server is not configured for receipt storage.', 503);

  const originalName = String(loaded.data.fileName ?? loaded.data.driveFileName ?? 'receipt');
  const storagePath = receiptStoragePath(context.orgId, receiptId, originalName, mimeType);
  await storage.bucket().file(storagePath).save(Buffer.from(bytes), {
    resumable: false,
    contentType: mimeType,
    metadata: { cacheControl: 'private, max-age=0', metadata: { orgId: context.orgId, receiptId } },
  });

  await loaded.ref.update({
    storagePath,
    storedAt: new Date(),
    storedBy: context.userId,
    sourceMimeType: mimeType,
    fileSize: bytes.byteLength,
  });

  return NextResponse.json({ storagePath });
}

export async function GET(req: NextRequest) {
  const context = await getReceiptRequestContext();
  if (!context) return json('Unauthorized: Access Denied.', 401);

  const stored = await readStoredReceipt(context.orgId, req.nextUrl.searchParams.get('receiptId'));
  if (!stored.ok) return json(stored.error, stored.status);

  const fileName = stored.storagePath.split('/').pop() ?? 'receipt';
  return new NextResponse(new Uint8Array(stored.bytes).buffer, {
    headers: {
      'Content-Type': stored.mimeType,
      'Content-Disposition': `inline; filename="${fileName}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}