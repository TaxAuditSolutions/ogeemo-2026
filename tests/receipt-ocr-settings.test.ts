import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyOcrRules,
  buildExtractionPrompt,
  DEFAULT_RECEIPT_OCR_SETTINGS,
  isValidIsoDate,
  matchVendorRule,
  maxReceiptFileBytes,
  normalizeReceiptOcrSettings,
} from '../src/lib/receipt-ocr-settings';

const defaults = DEFAULT_RECEIPT_OCR_SETTINGS;

test('missing or junk settings normalize to the defaults', () => {
  assert.deepEqual(normalizeReceiptOcrSettings(undefined), defaults);
  assert.deepEqual(normalizeReceiptOcrSettings('nonsense'), defaults);
  assert.deepEqual(normalizeReceiptOcrSettings({}), defaults);
});

test('invalid values are replaced individually and valid ones are kept', () => {
  const result = normalizeReceiptOcrSettings({
    model: 'gpt-9',
    language: 'French',
    dateFormat: 'dmy',
    defaultCurrency: 'usd',
    maxFileSizeMB: 500,
    amountTolerance: -3,
    maxFutureDays: 'soon',
    duplicateMode: 'nope',
    defaultLedgerType: 'asset',
  });
  assert.equal(result.model, defaults.model);
  assert.equal(result.language, 'French');
  assert.equal(result.dateFormat, 'dmy');
  assert.equal(result.defaultCurrency, 'USD');
  assert.equal(result.maxFileSizeMB, 10, 'capped at the 10 MB hard limit');
  assert.equal(result.amountTolerance, 0);
  assert.equal(result.maxFutureDays, defaults.maxFutureDays);
  assert.equal(result.duplicateMode, defaults.duplicateMode);
  assert.equal(result.defaultLedgerType, 'expense');
});

test('receipt OCR defaults and falls back to Gemini 3.8 Flash', () => {
  assert.equal(defaults.model, 'gemini-3.8-flash');
  for (const retired of ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite']) {
    const result = normalizeReceiptOcrSettings({ model: retired });
    assert.equal(result.model, defaults.model, `${retired} must not stay selected`);
  }
  assert.equal(normalizeReceiptOcrSettings({ model: 'gemini-3.8-flash' }).model, 'gemini-3.8-flash');
});

test('required fields keep only known fields, in a stable order', () => {
  const result = normalizeReceiptOcrSettings({ requiredFields: ['totalAmount', 'bogus', 'vendor'] });
  assert.deepEqual(result.requiredFields, ['vendor', 'totalAmount']);
  assert.deepEqual(normalizeReceiptOcrSettings({ requiredFields: [] }).requiredFields, []);
});

test('tax rates are cleaned, de-duplicated, sorted and limited', () => {
  const result = normalizeReceiptOcrSettings({ expectedTaxRates: [13, '5', 5, 0, -2, 'x', 200, 9.975] });
  assert.deepEqual(result.expectedTaxRates, [5, 9.975, 13, 100]);
});

test('vendor rules drop empty entries and unknown ledger types', () => {
  const result = normalizeReceiptOcrSettings({
    vendorRules: [
      { contains: '  Staples ', vendorName: 'Staples Canada', category: 'Office Supplies', ledgerType: 'expense' },
      { contains: '', category: 'Ignored' },
      { contains: 'Shell', ledgerType: 'asset' },
      null,
      'text',
    ],
  });
  assert.deepEqual(result.vendorRules, [
    { contains: 'Staples', vendorName: 'Staples Canada', category: 'Office Supplies', ledgerType: 'expense' },
    { contains: 'Shell' },
  ]);
});

test('file size limit follows the setting and never exceeds 10 MB', () => {
  assert.equal(maxReceiptFileBytes({ maxFileSizeMB: 5 }), 5 * 1024 * 1024);
  assert.equal(maxReceiptFileBytes({ maxFileSizeMB: 99 }), 10 * 1024 * 1024);
});

test('the prompt reflects the workspace rules', () => {
  const plain = buildExtractionPrompt(defaults);
  assert.match(plain, /vendor_name/);
  assert.match(plain, /If no currency is shown on the document, use CAD/);
  assert.doesNotMatch(plain, /most likely written in/);

  const custom = buildExtractionPrompt(
    normalizeReceiptOcrSettings({
      language: 'French',
      dateFormat: 'dmy',
      taxMode: 'included',
      defaultCurrency: 'EUR',
      customInstructions: 'Ignore loyalty points.',
    })
  );
  assert.match(custom, /most likely written in French/);
  assert.match(custom, /day\/month\/year/);
  assert.match(custom, /already include tax/);
  assert.match(custom, /use EUR/);
  assert.match(custom, /Ignore loyalty points\./);
});

test('isValidIsoDate rejects impossible dates', () => {
  assert.equal(isValidIsoDate('2026-10-31'), true);
  assert.equal(isValidIsoDate('2026-02-29'), false);
  assert.equal(isValidIsoDate('2026-13-01'), false);
  assert.equal(isValidIsoDate('10/31/2026'), false);
  assert.equal(isValidIsoDate(''), false);
});

test('rule engine completes missing amounts, validates the date and applies the default currency', () => {
  const noTotal = applyOcrRules({ vendor_name: 'Cafe', date: '2026-10-17', subtotal: 52.4, tax: 6.81 }, defaults);
  assert.equal(noTotal.data.total_amount, 59.21);
  assert.equal(noTotal.data.currency, 'CAD');

  const noSubtotal = applyOcrRules({ total_amount: 59.21, tax: 6.81 }, defaults);
  assert.equal(noSubtotal.data.subtotal, 52.4);

  const noTax = applyOcrRules({ total_amount: 59.21, subtotal: 52.4 }, defaults);
  assert.equal(noTax.data.tax, 6.81);

  const badDate = applyOcrRules({ vendor_name: 'X', date: '2026-02-30', total_amount: 5 }, defaults);
  assert.equal(badDate.data.date, '', 'an impossible date is dropped, not guessed');
});

test('rule engine does not invent amounts when fewer than two are known', () => {
  const only = applyOcrRules({ total_amount: 20 }, defaults);
  assert.equal(only.data.subtotal, 0);
  assert.equal(only.data.tax, 0);
  assert.equal(only.data.total_amount, 20);
});

test('vendor rules rename the vendor and suggest a category and ledger type', () => {
  const settings = normalizeReceiptOcrSettings({
    vendorRules: [{ contains: 'staples', vendorName: 'Staples Canada', category: 'Office Supplies', ledgerType: 'payable_bill' }],
  });
  const result = applyOcrRules({ vendor_name: 'STAPLES #1234 TORONTO', total_amount: 10 }, settings);
  assert.equal(result.data.vendor_name, 'Staples Canada');
  assert.deepEqual(result.suggested, { category: 'Office Supplies', ledgerType: 'payable_bill' });
  assert.equal(matchVendorRule('Home Depot', settings.vendorRules), undefined);
});
