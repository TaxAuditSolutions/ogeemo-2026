import type { Invoice } from '@/core/accounting-service';

/**
 * Shared handoff between invoice lists and the receipt page.
 * The receipt page reads this sessionStorage key on mount (single source of
 * truth for the key and payload shape).
 */

export const RECEIPT_DATA_KEY = 'ogeemo-receipt-data';

export interface ReceiptHandoffPayload {
  invoice: {
    id: string;
    invoiceNumber: string;
    companyName: string;
    originalAmount: number;
    amountPaid: number;
    dueDate: string;
    invoiceDate: string;
    createdAt: string;
  };
  carryForwardAmount: number;
  /** Latest payment receipt number (REC-...); legacy payments fall back to the invoice number. */
  receiptNumber?: string;
}

export function buildReceiptHandoff(inv: Invoice): ReceiptHandoffPayload {
  const toIso = (value: Date | string | undefined, fallback: () => Date) =>
    value ? new Date(value).toISOString() : fallback().toISOString();
  return {
    invoice: {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      companyName: inv.companyName,
      originalAmount: inv.originalAmount,
      amountPaid: inv.amountPaid,
      dueDate: toIso(inv.dueDate, () => new Date()),
      invoiceDate: toIso(inv.invoiceDate, () => new Date()),
      createdAt: toIso(inv.createdAt, () => new Date()),
    },
    carryForwardAmount: 0,
    receiptNumber: inv.lastReceiptNumber || undefined,
  };
}

/** Serializes the receipt payload and navigates to the receipt page. */
export function openInvoiceReceipt(inv: Invoice, push: (href: string) => void): void {
  sessionStorage.setItem(RECEIPT_DATA_KEY, JSON.stringify(buildReceiptHandoff(inv)));
  push('/accounting/invoices/receipt');
}
