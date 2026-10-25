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
  /** Resolved client contact email, when one is on file (powers the receipt page's Email button). */
  clientEmail?: string;
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
export function openInvoiceReceipt(
  inv: Invoice,
  push: (href: string) => void,
  opts?: { clientEmail?: string }
): void {
  const payload = buildReceiptHandoff(inv);
  if (opts?.clientEmail) payload.clientEmail = opts.clientEmail;
  sessionStorage.setItem(RECEIPT_DATA_KEY, JSON.stringify(payload));
  push('/accounting/invoices/receipt');
}

/**
 * Resolves a client's email from the loaded contacts: first the invoice's
 * contact (by id), then a name/businessName match against the invoice's
 * company. Returns undefined when nothing usable is on file.
 */
export function resolveClientEmail(
  inv: { contactId: string; companyName: string },
  contacts: ReadonlyArray<{ id: string; name: string; businessName?: string; email?: string }>
): string | undefined {
  const clean = (value?: string) => {
    const trimmed = (value || '').trim();
    return trimmed.length > 0 ? trimmed : undefined;
  };

  const direct = contacts.find((contact) => contact.id === inv.contactId);
  const directEmail = direct ? clean(direct.email) : undefined;
  if (directEmail) return directEmail;

  const byCompany = contacts.find(
    (contact) =>
      (contact.name === inv.companyName || contact.businessName === inv.companyName) &&
      clean(contact.email)
  );
  return byCompany ? clean(byCompany.email) : undefined;
}
