import assert from 'node:assert/strict';
import test from 'node:test';

import { archiveStatusLabel, filterArchive, isArchiveReceipt, type ArchiveReceipt } from '../src/lib/receipt-archive-utils';

const items: ArchiveReceipt[] = [
  { id: '1', status: 'posted', auditReferenceId: 'REC-20261031-001', merchantName: 'Northstar Office Supply', totalAmount: 172.14, proposedCategory: 'Office Supplies', transactionDate: '2026-10-16', fileHash: 'a' },
  { id: '2', status: 'queued', auditReferenceId: 'REC-20261031-002', fileName: 'taxi-slip.jpg', fileHash: 'b' },
  { id: '3', status: 'rejected', auditReferenceId: 'REC-20261031-003', merchantName: 'Cafe Roma', fileHash: 'c' },
  { id: '4', status: 'queued', demoReceiptId: 'demo-fuel' },
  { id: '5', status: 'queued', isDemo: true },
  { id: '6', status: 'posted', isDemo: true, fileHash: 'd', merchantName: 'Old upload' },
];

const ids = (list: ArchiveReceipt[]) => list.map((item) => item.id);

test('legacy samples are excluded but real uploads with an old demo flag are kept', () => {
  assert.equal(isArchiveReceipt(items[3]), false);
  assert.equal(isArchiveReceipt(items[4]), false);
  assert.equal(isArchiveReceipt(items[5]), true);
  assert.deepEqual(ids(filterArchive(items, '', 'all')), ['1', '2', '3', '6']);
});

test('status filters separate posted, open and removed receipts', () => {
  assert.deepEqual(ids(filterArchive(items, '', 'posted')), ['1', '6']);
  assert.deepEqual(ids(filterArchive(items, '', 'open')), ['2']);
  assert.deepEqual(ids(filterArchive(items, '', 'removed')), ['3']);
});

test('search matches the document number, vendor, file name, category, date and amount', () => {
  assert.deepEqual(ids(filterArchive(items, 'rec-20261031-002', 'all')), ['2']);
  assert.deepEqual(ids(filterArchive(items, 'northstar', 'all')), ['1']);
  assert.deepEqual(ids(filterArchive(items, 'TAXI', 'all')), ['2']);
  assert.deepEqual(ids(filterArchive(items, 'office supplies', 'all')), ['1']);
  assert.deepEqual(ids(filterArchive(items, '2026-10-16', 'all')), ['1']);
  assert.deepEqual(ids(filterArchive(items, '172.14', 'all')), ['1']);
  assert.deepEqual(ids(filterArchive(items, 'northstar cafe', 'all')), [], 'every word must match');
  assert.deepEqual(ids(filterArchive(items, 'northstar', 'removed')), [], 'search and status combine');
});

test('status labels are readable', () => {
  assert.equal(archiveStatusLabel('posted'), 'Posted');
  assert.equal(archiveStatusLabel('rejected'), 'Removed');
  assert.equal(archiveStatusLabel('queued'), 'In queue');
});
