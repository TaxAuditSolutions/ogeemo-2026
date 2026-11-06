import { z } from 'zod';
import { ai } from '@/ai/genkit';
import type { ReceiptMimeType } from '@/lib/receipt-file-utils';
import { applyOcrRules, buildExtractionPrompt } from '@/lib/receipt-ocr-rules';
import {
  DEFAULT_RECEIPT_OCR_SETTINGS,
  type ReceiptLedgerType,
  type ReceiptOcrSettings,
} from '@/lib/receipt-ocr-options';

/**
 * Server-side receipt OCR shared by the invoice-extraction action and the
 * receipt extraction route. Import this only from server code (it pulls in Genkit).
 * The workspace's OCR rules (Settings) choose the model, shape the prompt and
 * clean the result.
 */

// Fields the document does not show are optional, so the model is never forced to invent them.
export const ExtractionOutputSchema = z.object({
  vendor_name: z.string().optional().describe('The legal name of the business issuing the document.'),
  invoice_number: z.string().optional().describe('The vendor invoice or receipt number, not the Ogeemo document number.'),
  date: z.string().optional().describe('The date of the document in YYYY-MM-DD format.'),
  subtotal: z.number().optional().describe('The amount before taxes.'),
  tax: z.number().optional().describe('The total tax amount.'),
  total_amount: z.number().optional().describe('The final amount due.'),
  currency: z.string().optional().describe('The ISO currency code.'),
});

export interface ExtractedInvoice {
  vendor_name: string;
  invoice_number: string;
  date: string;
  subtotal: number;
  tax: number;
  total_amount: number;
  currency: string;
}

export interface ExtractionSuggestions {
  category?: string;
  ledgerType?: ReceiptLedgerType;
}

export type ExtractionResult = { data?: ExtractedInvoice; suggested?: ExtractionSuggestions; model?: string; error?: string };

/**
 * Runs OCR on the bytes of a PDF or image using the given workspace rules.
 * Never throws; failures come back as `{ error }`.
 */
export async function extractReceiptFromBytes(
  bytes: Uint8Array,
  mimeType: ReceiptMimeType,
  settings: ReceiptOcrSettings = DEFAULT_RECEIPT_OCR_SETTINGS
): Promise<ExtractionResult> {
  try {
    const base64 = Buffer.from(bytes).toString('base64');
    const response = await ai.generate({
      model: `googleai/${settings.model}`,
      prompt: [
        { media: { url: `data:${mimeType};base64,${base64}`, contentType: mimeType } },
        { text: buildExtractionPrompt(settings) },
      ],
      output: { schema: ExtractionOutputSchema },
    });

    const output = response.output;
    if (!output) return { error: 'OCR did not return structured data.' };
    const { data, suggested } = applyOcrRules(output, settings);
    return { data, suggested, model: settings.model };
  } catch (error: any) {
    console.error('[Receipt OCR Error]', error);
    return { error: error?.message || 'Unable to extract data from the document.' };
  }
}
