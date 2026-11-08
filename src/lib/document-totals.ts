/**
 * Quote / invoice totals (pure; see tests/document-totals.test.ts).
 *
 * Every amount is rounded to whole cents as it is calculated, so the subtotal,
 * the tax and the total shown on the document are exactly what is stored and
 * what the customer pays. Without this a total such as 67.7661 was saved as the
 * amount owed. Each line's tax is rounded on its own line, so the lines always
 * add up to the totals printed under them.
 */

export interface TotalsLine {
  quantity: number;
  price: number;
  /** Tax rate as a percentage, e.g. 13 for 13%. Missing means untaxed. */
  taxRate?: number | null;
}

export interface LineTotals {
  preTaxAmount: number;
  taxAmount: number;
  totalAmount: number;
}

export interface DocumentTotals {
  subtotal: number;
  tax: number;
  total: number;
}

/** Rounds to whole cents (half up), tolerating binary floating-point error. */
export function roundCents(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const sign = value < 0 ? -1 : 1;
  return (sign * Math.round((Math.abs(value) + Number.EPSILON) * 100)) / 100;
}

function safe(value: unknown): number {
  const number = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function calculateLineTotals(line: TotalsLine): LineTotals {
  const preTaxAmount = roundCents(safe(line.quantity) * safe(line.price));
  const taxAmount = roundCents((preTaxAmount * safe(line.taxRate)) / 100);
  return { preTaxAmount, taxAmount, totalAmount: roundCents(preTaxAmount + taxAmount) };
}

export function calculateDocumentTotals(lines: readonly TotalsLine[]): DocumentTotals {
  let subtotal = 0;
  let tax = 0;
  for (const line of lines) {
    const totals = calculateLineTotals(line);
    subtotal += totals.preTaxAmount;
    tax += totals.taxAmount;
  }
  subtotal = roundCents(subtotal);
  tax = roundCents(tax);
  return { subtotal, tax, total: roundCents(subtotal + tax) };
}
