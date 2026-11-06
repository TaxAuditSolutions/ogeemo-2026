import assert from 'node:assert/strict';
import test from 'node:test';

import {
  detectReceiptMime,
  isReceiptMimeType,
  MAX_RECEIPT_FILE_BYTES,
  validateReceiptFileSize,
} from '../src/lib/receipt-file-utils';

const bytes = (...values: number[]) => new Uint8Array(values);

test('detectReceiptMime identifies PDF, PNG, JPEG and WebP by content', () => {
  assert.equal(detectReceiptMime(new TextEncoder().encode('%PDF-1.4\n...')), 'application/pdf');
  assert.equal(detectReceiptMime(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0)), 'image/png');
  assert.equal(detectReceiptMime(bytes(0xff, 0xd8, 0xff, 0xe0)), 'image/jpeg');
  assert.equal(
    detectReceiptMime(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50)),
    'image/webp'
  );
});

test('detectReceiptMime rejects other content, including disguised files', () => {
  assert.equal(detectReceiptMime(new TextEncoder().encode('<html>not a receipt</html>')), null);
  assert.equal(detectReceiptMime(new TextEncoder().encode('MZ executable renamed to receipt.pdf')), null);
  assert.equal(detectReceiptMime(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45)), null); // WAV
  assert.equal(detectReceiptMime(new Uint8Array()), null);
  assert.equal(detectReceiptMime(bytes(0x25, 0x50)), null);
});

test('isReceiptMimeType only accepts the supported types', () => {
  assert.equal(isReceiptMimeType('application/pdf'), true);
  assert.equal(isReceiptMimeType('image/webp'), true);
  assert.equal(isReceiptMimeType('image/gif'), false);
  assert.equal(isReceiptMimeType('application/vnd.google-apps.document'), false);
  assert.equal(isReceiptMimeType(undefined), false);
});

test('validateReceiptFileSize enforces non-empty files within the limit', () => {
  assert.equal(validateReceiptFileSize(1024), null);
  assert.equal(validateReceiptFileSize(MAX_RECEIPT_FILE_BYTES), null);
  assert.match(validateReceiptFileSize(0) ?? '', /empty/);
  assert.match(validateReceiptFileSize(Number.NaN) ?? '', /empty/);
  assert.match(validateReceiptFileSize(undefined) ?? '', /empty/);
  assert.match(validateReceiptFileSize(MAX_RECEIPT_FILE_BYTES + 1) ?? '', /10 MB/);
});
