import type { ExtractionResult } from '@/lib/receipt-ocr';

/**
 * Maps an OCR result onto queue-item fields. Pure (type import only) so it is
 * safe to use from client code and tests. Failed OCR yields blank fields and
 * an explicit error - never today's date, zero amounts, or invented values.
 */

export interface OcrItemFields {
  merchantName?: string;
  vendorDocumentNumber?: string;
  transactionDate?: string;
  netAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
  currency?: string;
  proposedCompany: string;
  extractedRawJson: Record<string, unknown>;
  ocrStatus: 'completed' | 'failed';
  ocrError: string | null;
}

export function ocrResultToItemFields(extraction: ExtractionResult): OcrItemFields {
  const extracted = extraction.data;
  if (!extracted) {
    const ocrError = extraction.error || 'OCR did not return receipt data.';
    return {
      proposedCompany: '',
      extractedRawJson: { error: ocrError },
      ocrStatus: 'failed',
      ocrError,
    };
  }

  return {
    merchantName: extracted.vendor_name,
    vendorDocumentNumber: extracted.invoice_number,
    transactionDate: extracted.date,
    netAmount: extracted.subtotal,
    taxAmount: extracted.tax,
    totalAmount: extracted.total_amount,
    currency: extracted.currency,
    proposedCompany: extracted.vendor_name,
    extractedRawJson: { ...extracted },
    ocrStatus: 'completed',
    ocrError: null,
  };
}
