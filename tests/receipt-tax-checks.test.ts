import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_RECEIPT_OCR_SETTINGS, type ReceiptOcrSettings } from '../src/lib/receipt-ocr-options';
import { buildExtractionPrompt } from '../src/lib/receipt-ocr-rules';
import { normalizeReceiptOcrSettings, normalizeTaxChoices } from '../src/lib/receipt-ocr-settings';
import { reviewReceipt } from '../src/lib/receipt-review-checks';

const settings: ReceiptOcrSettings = DEFAULT_RECEIPT_OCR_SETTINGS;
const now = new Date('2026-10-31');

test('a receipt with no tax type chosen is blocked with a clear message', () => {
  const flags = reviewReceipt(settings, { id: 'r1', totalAmount: 113, printedTaxAmount: 13 }, { now });
  const flag = flags.find((f) => f.code === 'tax-type-needed');
  assert.ok(flag);
  assert.equal(flag?.severity, 'error');
});

test('a printed tax that differs from the calculated tax is flagged as a warning, not an error', () => {
  const flags = reviewReceipt(
    settings,
    { id: 'r1', totalAmount: 113, netAmount: 100, taxAmount: 13, taxChoiceId: 'hst-13', taxType: 'HST 13%', printedTaxAmount: 11.3 },
    { now }
  );
  const flag = flags.find((f) => f.code === 'printed-tax-differs');
  assert.ok(flag);
  assert.equal(flag?.severity, 'warning');
  assert.match(flag?.message ?? '', /11\.30/);
  assert.match(flag?.message ?? '', /13\.00/);
  assert.equal(flags.some((f) => f.code === 'amounts-mismatch'), false, 'calculated amounts always add up');
});

test('a printed tax within a couple of cents of the calculated tax is not flagged', () => {
  const flags = reviewReceipt(
    settings,
    { id: 'r1', totalAmount: 113, netAmount: 100, taxAmount: 13, taxChoiceId: 'hst-13', taxType: 'HST 13%', printedTaxAmount: 12.99 },
    { now }
  );
  assert.equal(flags.some((f) => f.code === 'printed-tax-differs'), false);
});

test('tax checks stay off when the workspace uses the printed tax', () => {
  const printed = { ...settings, taxCalculation: 'from_receipt' as const };
  const flags = reviewReceipt(printed, { id: 'r1', totalAmount: 113, netAmount: 100, taxAmount: 13 }, { now });
  assert.equal(flags.some((f) => f.code === 'tax-type-needed' || f.code === 'printed-tax-differs'), false);
});

test('tax settings normalize safely', () => {
  assert.deepEqual(normalizeReceiptOcrSettings(undefined).taxChoices, DEFAULT_RECEIPT_OCR_SETTINGS.taxChoices);
  assert.equal(normalizeReceiptOcrSettings({ taxCalculation: 'nonsense' }).taxCalculation, 'from_total');
  assert.equal(normalizeReceiptOcrSettings({ taxCalculation: 'from_receipt' }).taxCalculation, 'from_receipt');

  const cleaned = normalizeTaxChoices([
    { id: 'a b!', name: ' Sales tax ', rate: '7.5' },
    { id: 'ab', name: 'Duplicate of the first', rate: 9 },
    { id: 'neg', name: 'Too low', rate: -4 },
    { id: 'big', name: 'Too high', rate: 400 },
    { id: 'blank', name: '   ', rate: 5 },
    { name: 'No id', rate: 5 },
    'junk',
    null,
  ]);
  assert.deepEqual(cleaned, [
    { id: 'ab', name: 'Sales tax', rate: 7.5 },
    { id: 'neg', name: 'Too low', rate: 0 },
    { id: 'big', name: 'Too high', rate: 100 },
  ]);
  assert.deepEqual(normalizeTaxChoices([]), [], 'an empty list the admin saved stays empty');
});

test('a default tax type or vendor tax type that is not in the list is dropped', () => {
  const result = normalizeReceiptOcrSettings({
    taxChoices: [{ id: 'hst-13', name: 'HST 13%', rate: 13 }],
    defaultTaxChoice: 'gst-5',
    vendorRules: [
      { contains: 'staples', taxChoice: 'hst-13' },
      { contains: 'shell', taxChoice: 'gst-5' },
    ],
  });
  assert.equal(result.defaultTaxChoice, '');
  assert.equal(result.vendorRules[0].taxChoice, 'hst-13');
  assert.equal(result.vendorRules[1].taxChoice, undefined);
});

test('the OCR prompt asks for the total to be read exactly when tax is calculated', () => {
  assert.match(buildExtractionPrompt(settings), /total_amount exactly as printed/);
  assert.doesNotMatch(buildExtractionPrompt({ ...settings, taxCalculation: 'from_receipt' }), /total_amount exactly as printed/);
});
