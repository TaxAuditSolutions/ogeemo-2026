'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getCurrentUserId } from '@/app/actions';
import { getAdminStorage, getAdminDb } from '@/lib/firebase-admin';

/**
 * @fileOverview Server actions for High-Fidelity OCR and Data Extraction.
 * Uses Gemini 1.5 Pro to reason over PDF binaries and extract structured financial data.
 */

const ExtractionOutputSchema = z.object({
  vendor_name: z.string().describe('The legal name of the business issuing the invoice.'),
  invoice_number: z.string().describe('The unique reference number for the document.'),
  date: z.string().describe('The date of the invoice in YYYY-MM-DD format.'),
  subtotal: z.number().describe('The amount before taxes.'),
  tax: z.number().describe('The total tax amount.'),
  total_amount: z.number().describe('The final amount due.'),
  currency: z.string().default('USD').describe('The currency code.'),
});

export type ExtractedInvoice = z.infer<typeof ExtractionOutputSchema>;

/**
 * Extracts structured data from a PDF stored in Firebase Storage.
 */
export async function extractInvoiceData(fileId: string): Promise<{ data?: ExtractedInvoice; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: 'Authentication required.' };

  try {
    const db = getAdminDb();
    const storage = getAdminStorage();

    // 1. Fetch file metadata
    const fileDoc = await db.collection('files').doc(fileId).get();
    if (!fileDoc.exists || fileDoc.data()?.userId !== userId) {
      return { error: 'File not found or access denied.' };
    }

    const { storagePath, name } = fileDoc.data()!;
    if (!storagePath) return { error: 'File has no storage path.' };

    // 2. Download binary from storage
    const bucket = storage.bucket();
    const [fileBuffer] = await bucket.file(storagePath).download();
    const base64Pdf = fileBuffer.toString('base64');

    // 3. Process with Gemini 1.5 Pro
    const response = await ai.generate({
      model: 'googleai/gemini-1.5-pro',
      prompt: [
        {
          media: {
            url: `data:application/pdf;base64,${base64Pdf}`,
            contentType: 'application/pdf',
          },
        },
        { text: 'Extract the following fields from this invoice: vendor_name, invoice_number, date, subtotal, tax, and total_amount.' },
      ],
      output: { schema: ExtractionOutputSchema },
    });

    const output = response.output;
    if (!output) throw new Error('Intelligence extraction failed to return data.');

    return { data: output };

  } catch (error: any) {
    console.error('[OCR Action Error]', error);
    return { error: error.message || 'An error occurred during extraction.' };
  }
}
