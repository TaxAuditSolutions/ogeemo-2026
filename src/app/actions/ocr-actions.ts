
'use server';

import { getCurrentUserId } from '@/app/actions';
import { getAdminStorage, getAdminDb } from '@/core/firebase-admin';
import { extractReceiptFromBytes, type ExtractedInvoice, type ExtractionResult } from '@/lib/receipt-ocr';

/**
 * @fileOverview Server actions for High-Fidelity OCR and Data Extraction.
 * The extraction itself lives in '@/lib/receipt-ocr' so the file-import route
 * (src/app/api/receipts/extract/route.ts) shares the same prompt and model.
 */

export type { ExtractedInvoice, ExtractionResult };

async function extractPdfData(base64Pdf: string): Promise<ExtractionResult> {
  return extractReceiptFromBytes(new Uint8Array(Buffer.from(base64Pdf, 'base64')), 'application/pdf');
}

/**
 * Extracts structured data from a PDF. 
 * For GDrive files, it simulates the conversion of an external binary.
 * For internal files, it fetches from Firebase Storage.
 */
export async function extractInvoiceData(fileId: string, isExternal: boolean = false): Promise<{ data?: ExtractedInvoice; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: 'Unauthorized: Access Denied.' };

  try {
    const db = getAdminDb();
    const storage = getAdminStorage();

    if (!db || !storage) {
      return { error: 'Firebase Admin services are not initialized in this environment.' };
    }

    let base64Pdf: string;

    if (isExternal) {
        // Reading a file straight from Google Drive is not connected yet. This used to return an invented invoice
        // (a random number, today's date, $100 + $15 tax), which could then be posted to Accounts Payable as real.
        return { error: 'Reading files from Google Drive is not available yet. Add the PDF to the Document Manager and extract it from there.' };
    }

    // --- Internal Storage Extraction Logic ---
    const fileDoc = await db.collection('files').doc(fileId).get();
    if (!fileDoc.exists || fileDoc.data()?.userId !== userId) {
      return { error: 'File metadata not found in Ogeemo registry.' };
    }

    const { storagePath } = fileDoc.data()!;
    if (!storagePath) return { error: 'Operational Error: No storage binary linked to record.' };

    // Download binary from storage
    const bucket = storage.bucket();
    const [fileBuffer] = await bucket.file(storagePath).download();
    base64Pdf = fileBuffer.toString('base64');

    return await extractPdfData(base64Pdf);

  } catch (error: any) {
    console.error('[Neural Extraction Error]', error);
    return { error: error.message || 'Cognitive failure during PDF analysis.' };
  }
}

/**
 * Utility helper for formatting (ensure this exists in scope or use native)
 */
function format(date: Date, formatStr: string): string {
    return date.toISOString().split('T')[0];
}
