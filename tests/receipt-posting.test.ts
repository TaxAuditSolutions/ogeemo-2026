import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FALLBACK_EXPENSE_LINE,
  FALLBACK_INCOME_LINE,
  checkReceiptForPosting,
  resolveCategoryLine,
} from '../src/lib/receipt-posting';

const categories = [
  { name: 'Office expenses', categoryNumber: '8810' },
  { name: 'Advertising', categoryNumber: '8521' },
  { name: 'Old name', categoryNumber: '8521', isArchived: true },
  { name: 'Digital Subscriptions', categoryNumber: 'C-1' },
  { name: 'No number here' },
];

test('a category name becomes its line number, ignoring case and spaces', () => {
  assert.deepEqual(resolveCategoryLine('Office expenses', categories, FALLBACK_EXPENSE_LINE), { line: '8810', matched: true });
  assert.deepEqual(resolveCategoryLine('  advertising ', categories, FALLBACK_EXPENSE_LINE), { line: '8521', matched: true });
  assert.deepEqual(resolveCategoryLine('digital subscriptions', categories, FALLBACK_EXPENSE_LINE), { line: 'C-1', matched: true });
});

test('a line number that was already chosen is kept', () => {
  assert.deepEqual(resolveCategoryLine('8810', categories, FALLBACK_EXPENSE_LINE), { line: '8810', matched: true });
  assert.deepEqual(resolveCategoryLine('c-1', categories, FALLBACK_EXPENSE_LINE), { line: 'C-1', matched: true });
});

test('an unknown, blank or numberless category goes to Other expenses or Other income, and says so', () => {
  assert.deepEqual(resolveCategoryLine('Made up', categories, FALLBACK_EXPENSE_LINE), { line: '9270', matched: false });
  assert.deepEqual(resolveCategoryLine('', categories, FALLBACK_EXPENSE_LINE), { line: '9270', matched: false });
  assert.deepEqual(resolveCategoryLine(undefined, categories, FALLBACK_INCOME_LINE), { line: 'Part 3D', matched: false });
  assert.deepEqual(resolveCategoryLine('No number here', categories, FALLBACK_EXPENSE_LINE), { line: '9270', matched: false });
  assert.deepEqual(resolveCategoryLine('Office expenses', [], FALLBACK_EXPENSE_LINE), { line: '9270', matched: false });
});

test('an active category wins over an archived one with the same line', () => {
  const both = [{ name: 'Same', categoryNumber: '1', isArchived: true }, { name: 'Same', categoryNumber: '2' }];
  assert.equal(resolveCategoryLine('same', both, '9').line, '2');
});

const today = '2026-11-08';

test('a receipt with a total, a valid date and matching amounts posts as entered', () => {
  const result = checkReceiptForPosting({ totalAmount: 113, netAmount: 100, taxAmount: 13, transactionDate: '2026-10-30' }, today);
  assert.equal(result.error, null);
  assert.deepEqual(result.values, { date: '2026-10-30', totalAmount: 113, preTaxAmount: 100, taxAmount: 13 });
});

test('a total of zero, negative or missing is refused', () => {
  for (const totalAmount of [0, -5, undefined, null, NaN]) {
    assert.match(checkReceiptForPosting({ totalAmount: totalAmount as any }, today).error!, /total above zero/);
  }
});

test('a blank date means today, a bad date is refused', () => {
  assert.equal(checkReceiptForPosting({ totalAmount: 10, transactionDate: '' }, today).values!.date, today);
  assert.equal(checkReceiptForPosting({ totalAmount: 10 }, today).values!.date, today);
  assert.match(checkReceiptForPosting({ totalAmount: 10, transactionDate: '2026-02-30' }, today).error!, /not a valid date/);
  assert.match(checkReceiptForPosting({ totalAmount: 10, transactionDate: '30/10/2026' }, today).error!, /not a valid date/);
});

test('net plus tax that does not equal the total is refused, a cent or two of rounding is accepted', () => {
  assert.match(checkReceiptForPosting({ totalAmount: 113, netAmount: 100, taxAmount: 20 }, today).error!, /is not the total 113.00/);
  const rounded = checkReceiptForPosting({ totalAmount: 113, netAmount: 100, taxAmount: 12.99 }, today);
  // the total is what was paid, so the net takes up the cent
  assert.deepEqual([rounded.values!.preTaxAmount, rounded.values!.taxAmount, rounded.values!.totalAmount], [100.01, 12.99, 113]);
});

test('only one of net and tax is enough, the other is worked out', () => {
  assert.deepEqual(checkReceiptForPosting({ totalAmount: 113, netAmount: 100 }, today).values, { date: today, totalAmount: 113, preTaxAmount: 100, taxAmount: 13 });
  assert.deepEqual(checkReceiptForPosting({ totalAmount: 113, taxAmount: 13 }, today).values, { date: today, totalAmount: 113, preTaxAmount: 100, taxAmount: 13 });
  assert.match(checkReceiptForPosting({ totalAmount: 50, netAmount: 60 }, today).error!, /more than the total/);
  assert.match(checkReceiptForPosting({ totalAmount: 50, taxAmount: 60 }, today).error!, /more than the total/);
});

test('neither net nor tax means untaxed, and negative amounts are refused', () => {
  assert.deepEqual(checkReceiptForPosting({ totalAmount: 20 }, today).values, { date: today, totalAmount: 20, preTaxAmount: 20, taxAmount: 0 });
  assert.match(checkReceiptForPosting({ totalAmount: 20, netAmount: -1, taxAmount: 21 }, today).error!, /cannot be negative/);
});
