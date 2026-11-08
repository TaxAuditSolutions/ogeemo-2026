/**
 * The sales tax inside an invoice payment (pure; see tests/payment-tax.test.ts).
 *
 * BKS is cash-basis: sales tax is collected when the money arrives, so each payment
 * carries its share of the invoice's tax. The share is worked out from the running
 * total paid, which makes the pieces add up to the invoice's tax EXACTLY: a part
 * payment gets a rounded share, and the payment that clears the balance gets
 * whatever is left. No extra record is stored; it follows from what was paid before.
 */
import { roundCents } from '@/lib/document-totals';

const PAID_TOLERANCE = 0.01;

/** Tax recognised once `cumulativePaid` of `invoiceTotal` has been received. */
function taxRecognisedAt(invoiceTax: number, invoiceTotal: number, cumulativePaid: number): number {
  if (!(invoiceTotal > 0) || !(invoiceTax > 0) || !(cumulativePaid > 0)) return 0;
  const tax = Math.min(invoiceTax, invoiceTotal);
  if (cumulativePaid >= invoiceTotal - PAID_TOLERANCE) return roundCents(tax);
  return roundCents((tax * cumulativePaid) / invoiceTotal);
}

export interface PaymentTaxSplit {
  /** Tax included in this payment. */
  taxAmount: number;
  /** The payment before tax. */
  preTaxAmount: number;
}

/**
 * Splits one payment into tax and pre-tax parts.
 * @param invoiceTax   total tax on the invoice (from its line items)
 * @param invoiceTotal the invoice total, tax included
 * @param paidBefore   what had already been paid before this payment
 * @param payment      this payment
 */
export function splitPaymentTax(invoiceTax: number, invoiceTotal: number, paidBefore: number, payment: number): PaymentTaxSplit {
  const pay = roundCents(Number(payment) || 0);
  const before = Math.max(0, Number(paidBefore) || 0);
  const after = roundCents(before + pay);
  const raw = roundCents(taxRecognisedAt(Number(invoiceTax) || 0, Number(invoiceTotal) || 0, after) - taxRecognisedAt(Number(invoiceTax) || 0, Number(invoiceTotal) || 0, before));
  // Never a negative share, and never more than the payment itself.
  const taxAmount = Math.min(Math.max(raw, 0), Math.max(pay, 0));
  return { taxAmount, preTaxAmount: roundCents(pay - taxAmount) };
}

/** Tax rate (percent) implied by a tax and pre-tax pair, to 3 decimals; 0 when there is no tax. */
export function impliedTaxRate(preTaxAmount: number, taxAmount: number): number {
  if (!(preTaxAmount > 0) || !(taxAmount > 0)) return 0;
  return Math.round((taxAmount / preTaxAmount) * 100 * 1000) / 1000;
}
