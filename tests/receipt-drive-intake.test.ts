import assert from 'node:assert/strict';
import test from 'node:test';

import { nextReceiptDocumentNumber } from '../src/lib/receipt-document-number';
import { RECEIPT_OCR_MODEL_NAME, sha256Hex } from '../src/lib/receipt-file-utils';

test('sha256Hex matches the standard test vector and detects any change', async () => {
  const abc = await sha256Hex(new TextEncoder().encode('abc'));
  assert.equal(abc, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.notEqual(await sha256Hex(new TextEncoder().encode('abd')), abc);
  assert.equal(
    await sha256Hex(new Uint8Array()),
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  );
});

test('nextReceiptDocumentNumber continues the invoice-style daily sequence', () => {
  const date = '20261030';
  assert.equal(nextReceiptDocumentNumber([], date), 'REC-20261030-001');
  assert.equal(
    nextReceiptDocumentNumber(['REC-20261030-001', 'REC-20261030-002', 'REC-20261030-004'], date),
    'REC-20261030-005'
  );
});

test('nextReceiptDocumentNumber ignores other dates, prefixes and junk values', () => {
  assert.equal(
    nextReceiptDocumentNumber(
      ['REC-20261029-009', 'INV-20261030-007', 'REC-20261030-abc', undefined, null, 'REC-20261030-002'],
      '20261030'
    ),
    'REC-20261030-003'
  );
  assert.equal(nextReceiptDocumentNumber(['REC-20261030-999'], '20261031'), 'REC-20261031-001');
});

test('the OCR model name is a plain model id the server can namespace', () => {
  assert.match(RECEIPT_OCR_MODEL_NAME, /^gemini-[\w.-]+$/);
});
