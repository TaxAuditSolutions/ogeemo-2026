/**
 * Receipt tax logic (pure; see tests/receipt-tax.test.ts).
 *
 * With "calculate from the total", OCR reads only the amount paid. The reviewer picks a tax
 * type (for example HST 13%) and the tax is worked out from the total, so a vendor's printing
 * error or an OCR misread of a small tax line can never reach the ledger. Net + tax always
 * equals the total exactly. The tax printed on the receipt is kept as a reference only.
 */
import {
  RECEIPT_TAX_MANUAL,
  type ReceiptOcrSettings,
  type ReceiptTaxChoice,
} from '@/lib/receipt-ocr-options';

/** Rounds to whole cents, nudging exact halves up so 0.005 rounds to 0.01 despite float error. */
export function roundCents(value: number): number {
  return Math.round((value + Math.sign(value) * 1e-9) * 100) / 100;
}

/**
 * Splits a total that already includes tax. The rate is a percentage of the pre-tax amount, so
 * tax = total * rate / (100 + rate), rounded to the cent, and net is what remains.
 */
export function calculateTaxFromTotal(total: number, ratePercent: number): { taxAmount: number; netAmount: number } {
  const safeTotal = Number.isFinite(total) ? total : 0;
  if (!Number.isFinite(ratePercent) || ratePercent <= 0) {
    return { taxAmount: 0, netAmount: roundCents(safeTotal) };
  }
  const taxAmount = roundCents((safeTotal * ratePercent) / (100 + ratePercent));
  return { taxAmount, netAmount: roundCents(safeTotal - taxAmount) };
}

export function findTaxChoice(choices: readonly ReceiptTaxChoice[], id: string | undefined): ReceiptTaxChoice | undefined {
  return id ? choices.find((choice) => choice.id === id) : undefined;
}

/** Tax fields stored on a receipt queue item. */
export interface ReceiptTaxFields {
  taxChoiceId?: string;
  taxType?: string;
  taxRate?: number;
  netAmount?: number;
  taxAmount?: number;
}

/** Fields to save when the reviewer picks a tax type. Manual leaves net and tax for the reviewer to enter. */
export function taxFieldsForChoice(
  choices: readonly ReceiptTaxChoice[],
  choiceId: string,
  total: number | undefined
): ReceiptTaxFields {
  if (choiceId === RECEIPT_TAX_MANUAL) return { taxChoiceId: RECEIPT_TAX_MANUAL, taxType: '', taxRate: 0 };
  const choice = findTaxChoice(choices, choiceId);
  if (!choice) return {};
  const fields: ReceiptTaxFields = { taxChoiceId: choice.id, taxType: choice.name, taxRate: choice.rate };
  if (typeof total === 'number' && Number.isFinite(total)) Object.assign(fields, calculateTaxFromTotal(total, choice.rate));
  return fields;
}

/** True when this receipt's net and tax are calculated, so the screen shows them read-only. */
export function isTaxCalculated(
  settings: Pick<ReceiptOcrSettings, 'taxCalculation'>,
  item: { taxChoiceId?: string }
): boolean {
  return settings.taxCalculation === 'from_total' && Boolean(item.taxChoiceId) && item.taxChoiceId !== RECEIPT_TAX_MANUAL;
}

/**
 * Net and tax to save when the total changes on a receipt whose tax is calculated. A tax type that
 * was later removed from Settings keeps working through the rate stored on the receipt.
 */
export function taxFieldsForTotal(
  settings: Pick<ReceiptOcrSettings, 'taxCalculation' | 'taxChoices'>,
  item: { taxChoiceId?: string; taxRate?: number },
  total: number
): Pick<ReceiptTaxFields, 'netAmount' | 'taxAmount'> {
  if (!isTaxCalculated(settings, item)) return {};
  const rate = findTaxChoice(settings.taxChoices, item.taxChoiceId)?.rate ?? item.taxRate;
  return typeof rate === 'number' ? calculateTaxFromTotal(total, rate) : {};
}

export interface OcrTaxResult {
  fields: ReceiptTaxFields & { printedTaxAmount?: number };
  /** True when the net and tax OCR read must not be saved (they are calculated or left to the reviewer). */
  dropOcrNetAndTax: boolean;
}

/**
 * Decides the tax fields after OCR. Only the total is taken from OCR; the tax OCR read is kept as
 * printedTaxAmount for comparison. The tax type comes from, in order: the reviewer's earlier choice,
 * the matching vendor rule, the workspace default. With none of them the reviewer must choose.
 */
export function resolveOcrTax(
  settings: Pick<ReceiptOcrSettings, 'taxCalculation' | 'taxChoices' | 'defaultTaxChoice'>,
  data: { total_amount: number; tax: number },
  options: { currentChoiceId?: string; currentRate?: number; suggestedChoiceId?: string }
): OcrTaxResult {
  if (settings.taxCalculation !== 'from_total') return { fields: {}, dropOcrNetAndTax: false };

  const printedTaxAmount = Number.isFinite(data.tax) ? roundCents(data.tax) : 0;
  const base = { printedTaxAmount };

  const current = options.currentChoiceId;
  if (current === RECEIPT_TAX_MANUAL) return { fields: base, dropOcrNetAndTax: true };
  if (current) {
    const rate = findTaxChoice(settings.taxChoices, current)?.rate ?? options.currentRate;
    if (typeof rate === 'number') {
      return { fields: { ...base, ...calculateTaxFromTotal(data.total_amount, rate) }, dropOcrNetAndTax: true };
    }
  }

  for (const id of [options.suggestedChoiceId, settings.defaultTaxChoice]) {
    if (id && findTaxChoice(settings.taxChoices, id)) {
      return { fields: { ...base, ...taxFieldsForChoice(settings.taxChoices, id, data.total_amount) }, dropOcrNetAndTax: true };
    }
  }
  return { fields: base, dropOcrNetAndTax: true };
}
