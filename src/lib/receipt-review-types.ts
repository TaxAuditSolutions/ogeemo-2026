import type { ReceiptRequiredField } from '@/lib/receipt-ocr-options';

/**
 * Types and small helpers shared by the receipt review checks (pure).
 * "error" flags describe data that is missing or does not add up and can
 * block approval and posting; "warning" flags ask for a closer look.
 */

export interface ReceiptReviewable {
  id: string;
  merchantName?: string;
  proposedCompany?: string;
  transactionDate?: string;
  vendorDocumentNumber?: string;
  netAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
  proposedCategory?: string;
  businessReason?: string;
  ocrStatus?: 'completed' | 'failed';
  status?: string;
}

export interface ReceiptFlag {
  code: string;
  severity: 'error' | 'warning';
  field?: ReceiptRequiredField;
  message: string;
}

export const FIELD_LABELS: Record<ReceiptRequiredField, string> = {
  vendor: 'Vendor',
  date: 'Transaction date',
  vendorDocumentNumber: 'Vendor invoice / receipt number',
  netAmount: 'Net amount',
  taxAmount: 'Tax amount',
  totalAmount: 'Total amount',
  category: 'Category',
  businessReason: 'Business reason',
};

export function hasNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function fieldPresent(item: ReceiptReviewable, field: ReceiptRequiredField): boolean {
  switch (field) {
    case 'vendor':
      return Boolean((item.proposedCompany || item.merchantName || '').trim());
    case 'date':
      return Boolean((item.transactionDate || '').trim());
    case 'vendorDocumentNumber':
      return Boolean((item.vendorDocumentNumber || '').trim());
    case 'netAmount':
      return hasNumber(item.netAmount);
    case 'taxAmount':
      return hasNumber(item.taxAmount);
    case 'totalAmount':
      return hasNumber(item.totalAmount);
    case 'category':
      return Boolean((item.proposedCategory || '').trim());
    case 'businessReason':
      return Boolean((item.businessReason || '').trim());
  }
}

export function formatMoney(value: number): string {
  return value.toFixed(2);
}

export function blockingFlags(flags: readonly ReceiptFlag[]): ReceiptFlag[] {
  return flags.filter((flag) => flag.severity === 'error');
}

/** Vendor name used for comparisons: the reviewed company, else the OCR merchant. */
export function vendorOf(item: ReceiptReviewable): string {
  return (item.proposedCompany || item.merchantName || '').trim();
}

/**
 * Receipts that share vendor + date + total with another active receipt.
 * Returns a map of receipt id -> ids of the other receipts it matches.
 */
export function findPossibleDuplicates(items: readonly ReceiptReviewable[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const item of items) {
    if (item.status === 'rejected') continue;
    const vendor = vendorOf(item).toLocaleLowerCase();
    const date = (item.transactionDate || '').trim();
    if (!vendor || !date || !hasNumber(item.totalAmount) || item.totalAmount <= 0) continue;
    const key = `${vendor}|${date}|${item.totalAmount.toFixed(2)}`;
    groups.set(key, [...(groups.get(key) ?? []), item.id]);
  }

  const result = new Map<string, string[]>();
  for (const ids of groups.values()) {
    if (ids.length < 2) continue;
    for (const id of ids) result.set(id, ids.filter((other) => other !== id));
  }
  return result;
}
