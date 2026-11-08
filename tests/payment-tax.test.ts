import assert from 'node:assert/strict';
import test from 'node:test';

import { impliedTaxRate, splitPaymentTax } from '../src/lib/payment-tax';

test('a payment in full carries all of the invoice tax', () => {
  assert.deepEqual(splitPaymentTax(13, 113, 0, 113), { taxAmount: 13, preTaxAmount: 100 });
});

test('a part payment carries its proportional share of the tax', () => {
  // 50 of a 113.00 invoice with 13.00 tax: 13 x 50 / 113 = 5.752... -> 5.75.
  assert.deepEqual(splitPaymentTax(13, 113, 0, 50), { taxAmount: 5.75, preTaxAmount: 44.25 });
});

test('the final payment takes exactly what is left, so the tax adds up to the invoice tax', () => {
  const first = splitPaymentTax(13, 113, 0, 50);
  const second = splitPaymentTax(13, 113, 50, 63);
  assert.equal(second.taxAmount, 7.25);
  assert.equal(Math.round((first.taxAmount + second.taxAmount) * 100), 1300);
  assert.equal(Math.round((first.preTaxAmount + second.preTaxAmount) * 100), 10000);
});

test('many part payments always add up to the invoice tax and pre-tax exactly', () => {
  for (const [tax, total] of [[13, 113], [6.9, 59.97], [0.01, 1.14], [1234.56, 11000.01], [7.77, 77.77]] as const) {
    for (const parts of [2, 3, 5, 7, 12]) {
      let paid = 0;
      let taxSum = 0;
      let netSum = 0;
      for (let i = 1; i <= parts; i++) {
        const target = i === parts ? total : Math.round(((total * i) / parts) * 100) / 100;
        const payment = Math.round((target - paid) * 100) / 100;
        const split = splitPaymentTax(tax, total, paid, payment);
        assert.ok(split.taxAmount >= 0 && split.taxAmount <= payment, `tax within the payment (${tax}/${total} part ${i}/${parts})`);
        taxSum += split.taxAmount;
        netSum += split.preTaxAmount;
        paid = Math.round((paid + payment) * 100) / 100;
      }
      assert.equal(Math.round(taxSum * 100), Math.round(tax * 100), `tax ${tax}/${total} in ${parts} payments`);
      assert.equal(Math.round(netSum * 100), Math.round((total - tax) * 100), `net ${tax}/${total} in ${parts} payments`);
    }
  }
});

test('an invoice with no tax gives no tax on any payment', () => {
  assert.deepEqual(splitPaymentTax(0, 100, 0, 40), { taxAmount: 0, preTaxAmount: 40 });
  assert.deepEqual(splitPaymentTax(0, 100, 40, 60), { taxAmount: 0, preTaxAmount: 60 });
});

test('a payment within the one-cent tolerance of paying in full still clears the tax', () => {
  const split = splitPaymentTax(13, 113, 0, 112.99);
  assert.equal(split.taxAmount, 13);
});

test('bad inputs never produce negative, NaN or oversized tax', () => {
  const cases: [number, number, number, number][] = [
    [NaN, 113, 0, 50], [13, 0, 0, 50], [13, 113, NaN, 50], [13, 113, 0, NaN], [-5, 113, 0, 50], [13, 113, 200, 50], [200, 113, 0, 50],
  ];
  for (const args of cases) {
    const split = splitPaymentTax(args[0], args[1], args[2], args[3]);
    assert.ok(Number.isFinite(split.taxAmount) && Number.isFinite(split.preTaxAmount), JSON.stringify(args));
    assert.ok(split.taxAmount >= 0, JSON.stringify(args));
    assert.ok(split.taxAmount <= Math.max(Number(args[3]) || 0, 0) + 1e-9, JSON.stringify(args));
  }
});

test('implied tax rate is the tax over the pre-tax amount, or zero without tax', () => {
  assert.equal(impliedTaxRate(100, 13), 13);
  assert.equal(impliedTaxRate(44.25, 5.75), 12.994);
  assert.equal(impliedTaxRate(100, 0), 0);
  assert.equal(impliedTaxRate(0, 0), 0);
  assert.equal(impliedTaxRate(NaN, 5), 0);
});
