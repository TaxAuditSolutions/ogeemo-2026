/**
 * Ledger amounts and tax totals (pure; see tests/ledger-totals.test.ts).
 *
 * - An entry's amount is tax-inclusive: tax = total x rate / (100 + rate), rounded
 *   to the cent, and net is what remains, so net + tax is always exactly the total.
 * - Entries marked Personal are not business activity. They stay visible in the
 *   ledger but are left out of business income, expenses and sales tax.
 */
import { roundCents } from '@/lib/document-totals';
import { calculateTaxFromTotal } from '@/lib/receipt-tax';
import { isLedgerDateInRange } from '@/lib/ledger-date';

export interface LedgerAmounts {
  gross: number;
  net: number;
  tax: number;
}

/** Cents-exact gross, net and tax for quantity x tax-inclusive unit price at a rate (percent). */
export function ledgerAmountsFromGross(quantity: unknown, unitPrice: unknown, ratePercent: unknown): LedgerAmounts {
  const q = Number(quantity);
  const p = typeof unitPrice === 'string' ? parseFloat(unitPrice.replace(/,/g, '')) : Number(unitPrice);
  const gross = roundCents((Number.isFinite(q) ? q : 0) * (Number.isFinite(p) ? p : 0));
  const { taxAmount, netAmount } = calculateTaxFromTotal(gross, Number(ratePercent));
  return { gross, net: netAmount, tax: taxAmount };
}

/** False only for entries explicitly marked Personal (older entries without a type are business). */
export function isBusinessEntry(entry: { type?: string | null }): boolean {
  return entry.type !== 'personal';
}

/** Sum rounded to the cent, so long lists never drift by a fraction of a cent. */
export function sumCents(values: readonly (number | null | undefined)[]): number {
  let total = 0;
  for (const value of values) total += Number(value) || 0;
  return roundCents(total);
}

interface TaxEntry {
  date?: unknown;
  type?: string | null;
  taxAmount?: number | null;
}

export interface SalesTaxSummary {
  collected: number;
  paid: number;
  /** Collected minus paid plus any amount carried forward; positive means owing. */
  net: number;
}

/** Sales tax collected (income) and paid (expenses) for business entries dated within the period. */
export function summarizeSalesTax(
  income: readonly TaxEntry[],
  expenses: readonly TaxEntry[],
  period: { from?: Date | null; to?: Date | null },
  carriedForward = 0
): SalesTaxSummary {
  const inPeriod = (entry: TaxEntry) => isBusinessEntry(entry) && isLedgerDateInRange(entry.date, period.from, period.to);
  const collected = sumCents(income.filter(inPeriod).map((entry) => entry.taxAmount));
  const paid = sumCents(expenses.filter(inPeriod).map((entry) => entry.taxAmount));
  return { collected, paid, net: roundCents(collected - paid + (Number(carriedForward) || 0)) };
}
