import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isValidStorageId,
  receiptFileUrl,
  receiptStoragePath,
  safeReceiptFileName,
} from '../src/lib/receipt-storage-utils';

test('storage ids accept only safe characters', () => {
  assert.equal(isValidStorageId('cKoxa0iW6X5LLUhp6OSD'), true);
  assert.equal(isValidStorageId('org_1-A'), true);
  for (const bad of ['', '../x', 'a/b', 'a b', 'a\\b', 'x'.repeat(129), undefined, null, 5]) {
    assert.equal(isValidStorageId(bad), false, String(bad));
  }
});

test('file names are reduced to one safe segment with the right extension', () => {
  assert.equal(safeReceiptFileName('Office Supplies (Oct).PDF', 'application/pdf'), 'office-supplies-oct.pdf');
  assert.equal(safeReceiptFileName('../../etc/passwd', 'image/png'), 'passwd.png');
  assert.equal(safeReceiptFileName('C:\\Users\\me\\scan 1.jpeg', 'image/jpeg'), 'scan-1.jpg');
  assert.equal(safeReceiptFileName('', 'image/webp'), 'receipt.webp');
  assert.equal(safeReceiptFileName('...', 'application/pdf'), 'receipt.pdf');
  assert.equal(safeReceiptFileName('shell.exe', 'application/pdf'), 'shell.pdf', 'extension always matches the detected type');
  assert.ok(safeReceiptFileName('a'.repeat(300), 'application/pdf').length <= 84);
});

test('storage paths are workspace-scoped and reject unsafe ids', () => {
  assert.equal(
    receiptStoragePath('org123', 'rec456', 'Receipt.PDF', 'application/pdf'),
    'receipts/org123/rec456/receipt.pdf'
  );
  assert.throws(() => receiptStoragePath('../org', 'rec456', 'a.pdf', 'application/pdf'), /workspace/);
  assert.throws(() => receiptStoragePath('org123', 'rec/456', 'a.pdf', 'application/pdf'), /receipt id/);
});

test('receipt links are stable same-origin URLs', () => {
  assert.equal(receiptFileUrl('abc123'), '/api/receipts/files?receiptId=abc123');
  assert.equal(receiptFileUrl('a b'), '/api/receipts/files?receiptId=a%20b');
});
