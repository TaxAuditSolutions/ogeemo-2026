import { NextRequest, NextResponse } from 'next/server';
import { detectReceiptMime, validateReceiptFileSize } from '@/lib/receipt-file-utils';
import { extractReceiptFromBytes } from '@/lib/receipt-ocr';
import { maxReceiptFileBytes } from '@/lib/receipt-ocr-settings';
import { getReceiptRequestContext, loadReceiptOcrSettings } from '@/lib/receipt-server-auth';

export const runtime = 'nodejs';

/**
 * POST the raw bytes of a receipt (PDF, PNG, JPEG or WebP) and get OCR fields back.
 * A route handler is used instead of a Server Action because Server Actions
 * limit request bodies to 1 MB by default.
 *
 * Responses: 200 `{ data }` or `{ error }` (OCR ran but may have failed),
 * 400/413/415 for unusable uploads, 401 when not signed in.
 */
export async function POST(req: NextRequest) {
  const context = await getReceiptRequestContext();
  if (!context) {
    return NextResponse.json({ error: 'Unauthorized: Access Denied.' }, { status: 401 });
  }

  const settings = await loadReceiptOcrSettings(context.orgId);
  const limit = maxReceiptFileBytes(settings);
  const tooLarge = `The file is larger than ${settings.maxFileSizeMB} MB.`;

  const declaredLength = Number(req.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > limit) {
    return NextResponse.json({ error: tooLarge }, { status: 413 });
  }

  const bytes = new Uint8Array(await req.arrayBuffer());
  const sizeError = validateReceiptFileSize(bytes.byteLength);
  if (sizeError) {
    return NextResponse.json({ error: sizeError }, { status: bytes.byteLength === 0 ? 400 : 413 });
  }
  if (bytes.byteLength > limit) {
    return NextResponse.json({ error: tooLarge }, { status: 413 });
  }

  // The declared Content-Type is never trusted; the file's own bytes decide.
  const mimeType = detectReceiptMime(bytes);
  if (!mimeType) {
    return NextResponse.json({ error: 'Unsupported file. Use a PDF, PNG, JPEG, or WebP receipt.' }, { status: 415 });
  }

  const result = await extractReceiptFromBytes(bytes, mimeType, settings);
  return NextResponse.json(result);
}
