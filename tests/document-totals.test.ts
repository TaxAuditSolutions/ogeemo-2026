import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateDocumentTotals, calculateLineTotals, roundCents } from '../src/lib/document-totals';

test('roundCents rounds half up to whole cents and survives floating-point error', () => {
  assert.equal(roundCents(1.005), 1.01);
  assert.equal(roundCents(2.675), 2.68);
  assert.equal(roundCents(0.1 + 0.2), 0.3);
  assert.equal(roundCents(67.7661), 67.77);
  assert.equal(roundCents(-1.005), -1.01);
  assert.equal(roundCents(NaN), 0);
  assert.equal(roundCents(Infinity), 0);
});

test('exact half-cents round up at any size, including thousands (where a tiny nudge is lost)', () => {
  assert.equal(roundCents(8500.505), 8500.51);
  assert.equal(roundCents(12345.675), 12345.68);
  assert.equal(roundCents(999999.995), 1000000);
  assert.equal(roundCents(-8500.505), -8500.51);
  assert.equal(roundCents(0.005), 0.01);
});

test('rounding is unchanged for ordinary values and never returns negative zero or NaN', () => {
  assert.equal(roundCents(10), 10);
  assert.equal(roundCents(19.994), 19.99);
  assert.equal(roundCents(19.996), 20);
  assert.equal(Object.is(roundCents(-0.001), 0), true, 'no negative zero');
  assert.equal(roundCents(1e-9), 0);
  assert.equal(roundCents(1e21), 1e21, 'exponent-form numbers fall back safely');
  assert.equal(roundCents(-Infinity), 0);
});

test('a line is rounded to cents before its tax is worked out', () => {
  assert.deepEqual(calculateLineTotals({ quantity: 3, price: 19.99, taxRate: 13 }), {
    preTaxAmount: 59.97,
    taxAmount: 7.8,
    totalAmount: 67.77,
  });
  assert.deepEqual(calculateLineTotals({ quantity: 1, price: 100 }), { preTaxAmount: 100, taxAmount: 0, totalAmount: 100 });
});

test('the old unrounded total would have been a fraction of a cent; the new one is exact', () => {
  const lines = [{ quantity: 3, price: 19.99, taxRate: 13 }];
  const oldTotal = 3 * 19.99 + 3 * 19.99 * (13 / 100);
  assert.notEqual(oldTotal, Math.round(oldTotal * 100) / 100, 'sanity: the unrounded figure is not whole cents');
  const { total } = calculateDocumentTotals(lines);
  assert.equal(total, 67.77);
  assert.equal(Math.round(total * 100), total * 100 > 0 ? Math.round(total * 100) : 0);
});

test('each line is rounded on its own, so the lines add up to the printed totals', () => {
  const lines = Array.from({ length: 3 }, () => ({ quantity: 1, price: 0.1, taxRate: 5 }));
  // 0.1 x 5% = 0.005 -> 0.01 per line (rounded half up), so 3 lines = 0.03 tax, not 0.015 -> 0.02.
  const { subtotal, tax, total } = calculateDocumentTotals(lines);
  assert.equal(subtotal, 0.3);
  assert.equal(tax, 0.03);
  assert.equal(total, 0.33);
  const lineTax = lines.reduce((sum, line) => sum + calculateLineTotals(line).taxAmount, 0);
  assert.equal(roundCents(lineTax), tax);
});

test('mixed tax rates and untaxed lines', () => {
  const { subtotal, tax, total } = calculateDocumentTotals([
    { quantity: 2, price: 50, taxRate: 13 },
    { quantity: 1, price: 40, taxRate: 5 },
    { quantity: 4, price: 12.5 },
  ]);
  assert.equal(subtotal, 190);
  assert.equal(tax, 15);
  assert.equal(total, 205);
});

test('empty, missing, text and junk values never produce NaN', () => {
  assert.deepEqual(calculateDocumentTotals([]), { subtotal: 0, tax: 0, total: 0 });
  assert.deepEqual(calculateLineTotals({ quantity: NaN, price: 10, taxRate: 13 }), { preTaxAmount: 0, taxAmount: 0, totalAmount: 0 });
  assert.deepEqual(calculateLineTotals({ quantity: '2' as any, price: '10.50' as any, taxRate: null }), { preTaxAmount: 21, taxAmount: 0, totalAmount: 21 });
  assert.deepEqual(calculateLineTotals({ quantity: 1, price: 10, taxRate: undefined }), { preTaxAmount: 10, taxAmount: 0, totalAmount: 10 });
});

test('large documents stay exact to the cent', () => {
  const lines = Array.from({ length: 500 }, (_, i) => ({ quantity: 1 + (i % 7), price: 9.99 + i / 100, taxRate: 13 }));
  const { subtotal, tax, total } = calculateDocumentTotals(lines);
  assert.equal(total, roundCents(subtotal + tax));
  for (const value of [subtotal, tax, total]) {
    assert.equal(Math.round(value * 100) / 100, value, 'whole cents');
  }
});

test('credits (negative lines) reduce the total', () => {
  const { subtotal, tax, total } = calculateDocumentTotals([
    { quantity: 1, price: 200, taxRate: 10 },
    { quantity: 1, price: -50, taxRate: 10 },
  ]);
  assert.equal(subtotal, 150);
  assert.equal(tax, 15);
  assert.equal(total, 165);
});
