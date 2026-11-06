import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_RECEIPT_OCR_SETTINGS,
  RECEIPT_TAX_MANUAL,
  type ReceiptOcrSettings,
} from '../src/lib/receipt-ocr-options';
import {
  calculateTaxFromTotal,
  isTaxCalculated,
  resolveOcrTax,
  taxFieldsForChoice,
  taxFieldsForTotal,
} from '../src/lib/receipt-tax';

const settings: ReceiptOcrSettings = DEFAULT_RECEIPT_OCR_SETTINGS;

test('HST 13% is taken out of a tax-included total', () => {
  assert.deepEqual(calculateTaxFromTotal(113, 13), { taxAmount: 13, netAmount: 100 });
  assert.deepEqual(calculateTaxFromTotal(42, 5), { taxAmount: 2, netAmount: 40 });
  assert.deepEqual(calculateTaxFromTotal(50, 13), { taxAmount: 5.75, netAmount: 44.25 });
});

test('net + tax always equals the total exactly, for awkward totals and rates', () => {
  for (const rate of [5, 6, 7, 11, 12, 13, 14, 15, 14.975, 9.975]) {
    for (let cents = 1; cents <= 20000; cents += 37) {
      const total = cents / 100;
      const { taxAmount, netAmount } = calculateTaxFromTotal(total, rate);
      assert.equal(Math.round((taxAmount + netAmount) * 100), cents, `rate ${rate}, total ${total}`);
      assert.ok(taxAmount >= 0 && netAmount >= 0);
    }
  }
});

test('rounding goes to the nearest cent', () => {
  // 1.00 * 13 / 113 = 0.11504... -> 0.12 ; 0.50 * 13 / 113 = 0.05752... -> 0.06
  assert.equal(calculateTaxFromTotal(1, 13).taxAmount, 0.12);
  assert.equal(calculateTaxFromTotal(0.5, 13).taxAmount, 0.06);
});

test('no tax and zero rates leave the total as the net', () => {
  assert.deepEqual(calculateTaxFromTotal(80, 0), { taxAmount: 0, netAmount: 80 });
  assert.deepEqual(calculateTaxFromTotal(80, -3), { taxAmount: 0, netAmount: 80 });
  assert.deepEqual(calculateTaxFromTotal(80, Number.NaN), { taxAmount: 0, netAmount: 80 });
});

test('choosing a tax type fills the tax fields from the total', () => {
  const fields = taxFieldsForChoice(settings.taxChoices, 'hst-13', 113);
  assert.deepEqual(fields, { taxChoiceId: 'hst-13', taxType: 'HST 13%', taxRate: 13, taxAmount: 13, netAmount: 100 });
});

test('choosing a tax type before there is a total only records the choice', () => {
  const fields = taxFieldsForChoice(settings.taxChoices, 'gst-5', undefined);
  assert.deepEqual(fields, { taxChoiceId: 'gst-5', taxType: 'GST 5%', taxRate: 5 });
});

test('entering the tax by hand leaves the amounts alone', () => {
  assert.deepEqual(taxFieldsForChoice(settings.taxChoices, RECEIPT_TAX_MANUAL, 113), {
    taxChoiceId: RECEIPT_TAX_MANUAL,
    taxType: '',
    taxRate: 0,
  });
  assert.equal(isTaxCalculated(settings, { taxChoiceId: RECEIPT_TAX_MANUAL }), false);
  assert.deepEqual(taxFieldsForTotal(settings, { taxChoiceId: RECEIPT_TAX_MANUAL, taxRate: 0 }, 200), {});
});

test('an unknown tax type changes nothing', () => {
  assert.deepEqual(taxFieldsForChoice(settings.taxChoices, 'does-not-exist', 100), {});
});

test('editing the total recalculates tax; a tax type removed from Settings keeps its stored rate', () => {
  assert.deepEqual(taxFieldsForTotal(settings, { taxChoiceId: 'hst-13', taxRate: 13 }, 226), { taxAmount: 26, netAmount: 200 });
  const withoutHst = { ...settings, taxChoices: settings.taxChoices.filter((c) => c.id !== 'hst-13') };
  assert.deepEqual(taxFieldsForTotal(withoutHst, { taxChoiceId: 'hst-13', taxRate: 13 }, 226), { taxAmount: 26, netAmount: 200 });
});

test('nothing is calculated when the workspace uses the printed tax', () => {
  const printed = { ...settings, taxCalculation: 'from_receipt' as const };
  assert.equal(isTaxCalculated(printed, { taxChoiceId: 'hst-13' }), false);
  assert.deepEqual(taxFieldsForTotal(printed, { taxChoiceId: 'hst-13', taxRate: 13 }, 226), {});
  assert.deepEqual(resolveOcrTax(printed, { total_amount: 113, tax: 11.3 }, {}), { fields: {}, dropOcrNetAndTax: false });
});

test('after OCR only the total is used; the printed tax is kept for comparison', () => {
  const result = resolveOcrTax(settings, { total_amount: 113, tax: 11.3 }, {});
  assert.equal(result.dropOcrNetAndTax, true);
  assert.deepEqual(result.fields, { printedTaxAmount: 11.3 }, 'no tax type chosen yet, so no tax is booked');
});

test('after OCR the tax type comes from the reviewer, then the vendor rule, then the default', () => {
  const withDefault = { ...settings, defaultTaxChoice: 'gst-5' };
  const data = { total_amount: 113, tax: 0 };

  assert.equal(resolveOcrTax(withDefault, data, {}).fields.taxChoiceId, 'gst-5');

  const fromVendor = resolveOcrTax(withDefault, data, { suggestedChoiceId: 'hst-13' });
  assert.deepEqual(
    { id: fromVendor.fields.taxChoiceId, tax: fromVendor.fields.taxAmount, net: fromVendor.fields.netAmount },
    { id: 'hst-13', tax: 13, net: 100 }
  );

  const fromReviewer = resolveOcrTax(withDefault, data, { currentChoiceId: 'hst-15', suggestedChoiceId: 'hst-13' });
  assert.equal(fromReviewer.fields.taxChoiceId, undefined, "the reviewer's choice is kept, not rewritten");
  assert.equal(fromReviewer.fields.taxAmount, 14.74);
  assert.equal(fromReviewer.fields.netAmount, 98.26);
});

test('a reviewer who chose to enter tax by hand keeps their amounts after a retry', () => {
  const result = resolveOcrTax(settings, { total_amount: 113, tax: 11.3 }, { currentChoiceId: RECEIPT_TAX_MANUAL });
  assert.equal(result.dropOcrNetAndTax, true);
  assert.deepEqual(result.fields, { printedTaxAmount: 11.3 });
});

test('a suggested or default tax type that no longer exists is ignored', () => {
  const result = resolveOcrTax({ ...settings, defaultTaxChoice: 'gone' }, { total_amount: 50, tax: 0 }, { suggestedChoiceId: 'also-gone' });
  assert.deepEqual(result.fields, { printedTaxAmount: 0 });
});
