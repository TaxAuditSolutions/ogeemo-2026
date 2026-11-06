import assert from 'node:assert/strict';
import test from 'node:test';

import {
  blockingFlags,
  findPossibleDuplicates,
  reviewReceipt,
  type ReceiptReviewable,
} from '../src/lib/receipt-review-checks';
import { DEFAULT_RECEIPT_OCR_SETTINGS, normalizeReceiptOcrSettings } from '../src/lib/receipt-ocr-settings';

const NOW = new Date(2026, 9, 31); // 2026-10-31 local
const settings = DEFAULT_RECEIPT_OCR_SETTINGS;

const good: ReceiptReviewable = {
  id: 'a',
  merchantName: 'Northstar Office Supply Co.',
  transactionDate: '2026-10-16',
  netAmount: 163.94,
  taxAmount: 8.2,
  totalAmount: 172.14,
  proposedCategory: 'Office Supplies',
  businessReason: 'Supplies for client work',
  ocrStatus: 'completed',
};

const codes = (flags: { code: string }[]) => flags.map((flag) => flag.code).sort();

test('a complete, consistent receipt has no flags', () => {
  assert.deepEqual(reviewReceipt(settings, good, { now: NOW }), []);
});

test('required fields are flagged as errors and follow the settings', () => {
  const empty = reviewReceipt(settings, { id: 'b' }, { now: NOW });
  assert.deepEqual(
    codes(blockingFlags(empty)),
    ['missing-businessReason', 'missing-category', 'missing-date', 'missing-totalAmount', 'missing-vendor']
  );

  const relaxed = normalizeReceiptOcrSettings({ requiredFields: ['totalAmount'] });
  assert.deepEqual(codes(reviewReceipt(relaxed, { id: 'b' }, { now: NOW })), ['missing-totalAmount']);

  const strict = normalizeReceiptOcrSettings({ requiredFields: ['vendorDocumentNumber'] });
  assert.deepEqual(codes(reviewReceipt(strict, good, { now: NOW })), ['missing-vendorDocumentNumber']);
});

test('net + tax must equal the total within the tolerance', () => {
  const off = { ...good, totalAmount: 175.14 };
  const flags = reviewReceipt(settings, off, { now: NOW });
  assert.deepEqual(codes(flags), ['amounts-mismatch']);
  assert.equal(flags[0].severity, 'error');
  assert.match(flags[0].message, /3\.00/);

  const withinCent = { ...good, totalAmount: 172.15 };
  assert.deepEqual(reviewReceipt(settings, withinCent, { now: NOW }), []);

  const loose = normalizeReceiptOcrSettings({ amountTolerance: 5 });
  assert.deepEqual(reviewReceipt(loose, off, { now: NOW }), []);
});

test('a zero or negative total is an error', () => {
  const flags = reviewReceipt(settings, { ...good, netAmount: undefined, taxAmount: undefined, totalAmount: 0 }, { now: NOW });
  assert.ok(codes(flags).includes('total-not-positive'));
});

test('invalid, future and old dates are flagged', () => {
  assert.deepEqual(codes(reviewReceipt(settings, { ...good, transactionDate: '2026-02-30' }, { now: NOW })), ['date-invalid']);
  assert.deepEqual(codes(reviewReceipt(settings, { ...good, transactionDate: '2026-12-25' }, { now: NOW })), ['date-future']);
  assert.deepEqual(reviewReceipt(settings, { ...good, transactionDate: '2026-11-01' }, { now: NOW }), [], 'within the 1-day allowance');

  const age = normalizeReceiptOcrSettings({ maxAgeDays: 90 });
  assert.deepEqual(codes(reviewReceipt(age, { ...good, transactionDate: '2026-01-01' }, { now: NOW })), ['date-old']);
  assert.deepEqual(reviewReceipt(settings, { ...good, transactionDate: '2020-01-01' }, { now: NOW }), [], 'no age limit by default');
});

test('unexpected tax rates warn only when expected rates are configured', () => {
  assert.deepEqual(reviewReceipt(settings, good, { now: NOW }), []);

  const rates = normalizeReceiptOcrSettings({ expectedTaxRates: [5, 13] });
  assert.deepEqual(reviewReceipt(rates, good, { now: NOW }), [], '8.2 / 163.94 is about 5%');

  const odd = { ...good, netAmount: 100, taxAmount: 9, totalAmount: 109 };
  const flags = reviewReceipt(rates, odd, { now: NOW });
  assert.deepEqual(codes(flags), ['unexpected-tax-rate']);
  assert.equal(flags[0].severity, 'warning');
});

test('amounts over the review limit warn', () => {
  const limit = normalizeReceiptOcrSettings({ maxReceiptAmount: 100 });
  assert.deepEqual(codes(reviewReceipt(limit, good, { now: NOW })), ['amount-over-limit']);
});

test('failed OCR is a warning, and missing fields are the blocking errors', () => {
  const flags = reviewReceipt(settings, { id: 'c', ocrStatus: 'failed' }, { now: NOW });
  assert.ok(codes(flags).includes('ocr-failed'));
  assert.equal(flags.find((flag) => flag.code === 'ocr-failed')?.severity, 'warning');
  assert.ok(blockingFlags(flags).length > 0);
});

test('possible duplicates share vendor, date and total, ignoring case and rejected items', () => {
  const items: ReceiptReviewable[] = [
    { id: '1', merchantName: 'Cafe Roma', transactionDate: '2026-10-10', totalAmount: 20 },
    { id: '2', merchantName: 'CAFE ROMA', transactionDate: '2026-10-10', totalAmount: 20 },
    { id: '3', merchantName: 'Cafe Roma', transactionDate: '2026-10-11', totalAmount: 20 },
    { id: '4', merchantName: 'Cafe Roma', transactionDate: '2026-10-10', totalAmount: 20, status: 'rejected' },
    { id: '5', merchantName: '', transactionDate: '2026-10-10', totalAmount: 20 },
  ];
  const duplicates = findPossibleDuplicates(items);
  assert.deepEqual(duplicates.get('1'), ['2']);
  assert.deepEqual(duplicates.get('2'), ['1']);
  assert.equal(duplicates.has('3'), false);
  assert.equal(duplicates.has('4'), false);

  const flags = reviewReceipt(settings, good, { now: NOW, duplicateOfIds: ['x'] });
  assert.deepEqual(codes(flags), ['possible-duplicate']);
});
