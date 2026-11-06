import assert from 'node:assert/strict';
import test from 'node:test';

import { dedupeById, getOcrEligibleItems, isVisibleReceiptQueueItem, mergeQueueItems } from '../src/lib/receipt-queue-utils';

type Row = { id: string; label: string };

test('dedupeById keeps the first occurrence and original order', () => {
  const rows: Row[] = [
    { id: 'a', label: 'first' },
    { id: 'b', label: 'b' },
    { id: 'a', label: 'second' },
  ];
  assert.deepEqual(dedupeById(rows), [
    { id: 'a', label: 'first' },
    { id: 'b', label: 'b' },
  ]);
});

test('mergeQueueItems replaces a retried item in place instead of duplicating its key', () => {
  const current: Row[] = [
    { id: 'cKoxa0iW6X5LLUhp6OSD', label: 'OCR failed' },
    { id: 'other', label: 'other' },
  ];
  const incoming: Row[] = [{ id: 'cKoxa0iW6X5LLUhp6OSD', label: 'OCR completed' }];

  const merged = mergeQueueItems(current, incoming);

  assert.deepEqual(merged, [
    { id: 'cKoxa0iW6X5LLUhp6OSD', label: 'OCR completed' },
    { id: 'other', label: 'other' },
  ]);
  assert.equal(new Set(merged.map((row) => row.id)).size, merged.length);
});

test('mergeQueueItems puts genuinely new items first and never repeats an id', () => {
  const current: Row[] = [{ id: 'old', label: 'old' }];
  const incoming: Row[] = [
    { id: 'new-1', label: 'new 1' },
    { id: 'old', label: 'old refreshed' },
    { id: 'new-1', label: 'new 1 again' },
  ];

  const merged = mergeQueueItems(current, incoming);

  assert.deepEqual(merged.map((row) => row.id), ['new-1', 'old']);
  assert.equal(merged[0].label, 'new 1 again');
  assert.equal(merged[1].label, 'old refreshed');
});

test('mergeQueueItems with nothing incoming returns the current queue unchanged', () => {
  const current: Row[] = [{ id: 'a', label: 'a' }];
  assert.deepEqual(mergeQueueItems(current, []), current);
});

test('OCR All includes only queued receipts that have not completed OCR', () => {
  const queue = [
    { id: 'new', status: 'queued' as const },
    { id: 'retry', status: 'queued' as const, ocrStatus: 'failed' as const },
    { id: 'done', status: 'queued' as const, ocrStatus: 'completed' as const },
    { id: 'reviewed', status: 'reviewed' as const },
    { id: 'processing', status: 'processing' as const },
    { id: 'posted', status: 'posted' as const },
    { id: 'rejected', status: 'rejected' as const },
  ];

  assert.deepEqual(getOcrEligibleItems(queue).map((item) => item.id), ['new', 'retry']);
});

test('queue visibility removes samples but preserves real uploads with legacy demo flags', () => {
  const queue = [
    { id: 'bundled-sample', status: 'queued' as const, demoReceiptId: 'demo-office-supplies' },
    { id: 'legacy-sample', status: 'queued' as const, isDemo: true },
    { id: 'real-upload', status: 'queued' as const, isDemo: true, fileHash: 'abc123' },
    { id: 'new-upload', status: 'queued' as const, fileHash: 'def456' },
    { id: 'posted', status: 'posted' as const, fileHash: 'posted123' },
    { id: 'rejected', status: 'rejected' as const, fileHash: 'rejected123' },
  ];

  assert.deepEqual(queue.filter(isVisibleReceiptQueueItem).map((item) => item.id), ['real-upload', 'new-upload']);
});
