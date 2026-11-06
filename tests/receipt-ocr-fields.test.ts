import assert from 'node:assert/strict';
import test from 'node:test';

import { ocrResultToItemFields } from '../src/lib/receipt-ocr-fields';

test('a successful OCR result fills the item fields and records completion', () => {
  const fields = ocrResultToItemFields({
    data: {
      vendor_name: 'Northstar Office Supply Co.',
      invoice_number: 'NS-1048',
      date: '2026-10-16',
      subtotal: 163.94,
      tax: 8.2,
      total_amount: 172.14,
      currency: 'CAD',
    },
  });

  assert.equal(fields.ocrStatus, 'completed');
  assert.equal(fields.ocrError, null);
  assert.equal(fields.merchantName, 'Northstar Office Supply Co.');
  assert.equal(fields.proposedCompany, 'Northstar Office Supply Co.');
  assert.equal(fields.vendorDocumentNumber, 'NS-1048');
  assert.equal(fields.transactionDate, '2026-10-16');
  assert.equal(fields.netAmount, 163.94);
  assert.equal(fields.taxAmount, 8.2);
  assert.equal(fields.totalAmount, 172.14);
  assert.equal(fields.currency, 'CAD');
});

test('a failed OCR result never invents a date, amounts, or vendor', () => {
  const fields = ocrResultToItemFields({ error: 'quota exceeded' });

  assert.equal(fields.ocrStatus, 'failed');
  assert.equal(fields.ocrError, 'quota exceeded');
  assert.equal(fields.proposedCompany, '');
  for (const key of ['merchantName', 'vendorDocumentNumber', 'transactionDate', 'netAmount', 'taxAmount', 'totalAmount', 'currency'] as const) {
    assert.equal(fields[key], undefined, key);
  }
  assert.deepEqual(fields.extractedRawJson, { error: 'quota exceeded' });
});

test('an empty OCR result still reports a readable failure', () => {
  const fields = ocrResultToItemFields({});
  assert.equal(fields.ocrStatus, 'failed');
  assert.ok((fields.ocrError ?? '').length > 0);
});

test('every field is Firestore-safe (no undefined values once filtered by the caller)', () => {
  const fields = ocrResultToItemFields({ error: 'x' });
  const defined = Object.entries(fields).filter(([, value]) => value !== undefined);
  assert.ok(defined.length >= 4);
});
