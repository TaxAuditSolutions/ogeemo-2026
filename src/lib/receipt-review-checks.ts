import type { ReceiptOcrSettings } from '@/lib/receipt-ocr-options';
import { isValidIsoDate } from '@/lib/receipt-ocr-rules';
import {
  FIELD_LABELS,
  fieldPresent,
  formatMoney,
  hasNumber,
  type ReceiptFlag,
  type ReceiptReviewable,
} from '@/lib/receipt-review-types';

export * from '@/lib/receipt-review-types';

/**
 * Review checks run against a receipt's current field values using the
 * workspace's OCR rules (pure; see tests/receipt-review-checks.test.ts).
 */

function dayNumber(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

function todayNumber(now: Date): number {
  return Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000);
}

function amountFlags(settings: ReceiptOcrSettings, item: ReceiptReviewable): ReceiptFlag[] {
  const flags: ReceiptFlag[] = [];
  const { netAmount: net, taxAmount: tax, totalAmount: total } = item;

  if (hasNumber(total) && total <= 0) {
    flags.push({ code: 'total-not-positive', severity: 'error', field: 'totalAmount', message: 'Total amount must be greater than zero.' });
  }

  if (hasNumber(net) && hasNumber(tax) && hasNumber(total)) {
    const difference = Math.round((net + tax - total) * 100) / 100;
    if (Math.abs(difference) > settings.amountTolerance + 1e-9) {
      flags.push({
        code: 'amounts-mismatch',
        severity: 'error',
        field: 'totalAmount',
        message: `Net ${formatMoney(net)} + tax ${formatMoney(tax)} = ${formatMoney(net + tax)}, which differs from the total ${formatMoney(total)} by ${formatMoney(Math.abs(difference))}.`,
      });
    }
  }

  if (settings.taxCalculation === 'from_total' && hasNumber(total) && total > 0) {
    if (!item.taxChoiceId) {
      flags.push({
        code: 'tax-type-needed',
        severity: 'error',
        field: 'taxAmount',
        message: 'Choose the tax type for this receipt (for example HST 13%) so the tax can be calculated from the total.',
      });
    } else if (hasNumber(item.printedTaxAmount) && item.printedTaxAmount > 0 && hasNumber(tax)) {
      // Vendors round per line, so allow a couple of cents before calling it a difference.
      const gap = Math.round((item.printedTaxAmount - tax) * 100) / 100;
      if (Math.abs(gap) > Math.max(settings.amountTolerance, 0.02) + 1e-9) {
        flags.push({
          code: 'printed-tax-differs',
          severity: 'warning',
          field: 'taxAmount',
          message: `The receipt prints tax of ${formatMoney(item.printedTaxAmount)}, but ${item.taxType || 'the chosen tax type'} on the total gives ${formatMoney(tax)}. Check the tax type, or the vendor may have charged the wrong tax.`,
        });
      }
    }
  }

  if (settings.expectedTaxRates.length > 0 && hasNumber(net) && hasNumber(tax) && net > 0 && tax > 0) {
    const rate = (tax / net) * 100;
    if (!settings.expectedTaxRates.some((expected) => Math.abs(expected - rate) <= 0.5)) {
      flags.push({
        code: 'unexpected-tax-rate',
        severity: 'warning',
        field: 'taxAmount',
        message: `The tax works out to ${rate.toFixed(2)}%, which is not one of your expected rates (${settings.expectedTaxRates.join('%, ')}%).`,
      });
    }
  }

  if (settings.maxReceiptAmount > 0 && hasNumber(total) && total > settings.maxReceiptAmount) {
    flags.push({
      code: 'amount-over-limit',
      severity: 'warning',
      field: 'totalAmount',
      message: `The total ${formatMoney(total)} is above your review limit of ${formatMoney(settings.maxReceiptAmount)}.`,
    });
  }
  return flags;
}

function dateFlags(settings: ReceiptOcrSettings, item: ReceiptReviewable, now: Date): ReceiptFlag[] {
  const date = (item.transactionDate || '').trim();
  if (!date) return [];
  if (!isValidIsoDate(date)) {
    return [{ code: 'date-invalid', severity: 'error', field: 'date', message: 'The transaction date is not a valid date.' }];
  }

  const flags: ReceiptFlag[] = [];
  const age = todayNumber(now) - dayNumber(date);
  if (age < -settings.maxFutureDays) {
    flags.push({ code: 'date-future', severity: 'warning', field: 'date', message: 'The transaction date is in the future.' });
  }
  if (settings.maxAgeDays > 0 && age > settings.maxAgeDays) {
    flags.push({ code: 'date-old', severity: 'warning', field: 'date', message: `The transaction date is more than ${settings.maxAgeDays} days old.` });
  }
  return flags;
}

export function reviewReceipt(
  settings: ReceiptOcrSettings,
  item: ReceiptReviewable,
  options: { duplicateOfIds?: readonly string[]; now?: Date } = {}
): ReceiptFlag[] {
  const flags: ReceiptFlag[] = [];

  if (item.ocrStatus === 'failed') {
    flags.push({ code: 'ocr-failed', severity: 'warning', message: 'OCR failed for this receipt. Enter the fields from the source document.' });
  }

  for (const field of settings.requiredFields) {
    if (!fieldPresent(item, field)) {
      flags.push({ code: `missing-${field}`, severity: 'error', field, message: `${FIELD_LABELS[field]} is required.` });
    }
  }

  flags.push(...amountFlags(settings, item), ...dateFlags(settings, item, options.now ?? new Date()));

  if (options.duplicateOfIds && options.duplicateOfIds.length > 0) {
    flags.push({
      code: 'possible-duplicate',
      severity: 'warning',
      message: 'Another receipt has the same vendor, date and total. Check that this is not a duplicate.',
    });
  }

  return flags;
}
