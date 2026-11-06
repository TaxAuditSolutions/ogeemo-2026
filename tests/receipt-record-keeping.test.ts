import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPaperFilingCsv,
  postingBlockReason,
  resolveRecordKeeping,
} from '../src/lib/receipt-record-keeping';
import { DEFAULT_RECEIPT_OCR_SETTINGS, normalizeReceiptOcrSettings } from '../src/lib/receipt-ocr-settings';
import { buildRecordKeepingLogEntry } from '../src/lib/receipt-settings-log';

const base = DEFAULT_RECEIPT_OCR_SETTINGS;

test('new workspaces default to Simple mode with a scan kept', () => {
  assert.equal(base.recordKeepingMode, 'simple');
  assert.equal(base.keepScan, true);
  assert.equal(base.requireScanToPost, false);
  assert.deepEqual(normalizeReceiptOcrSettings(undefined).recordKeepingMode, 'simple');
});

test('Simple mode stores a scan but never blocks posting', () => {
  const controls = resolveRecordKeeping({ ...base, recordKeepingMode: 'simple', requireScanToPost: true, blockPostingOnErrors: true });
  assert.deepEqual(controls, { mode: 'simple', keepScan: true, requireScanToPost: false, blockPostingOnErrors: false });
});

test('Audit-ready mode requires a scan and blocks on errors, whatever the saved switches say', () => {
  const controls = resolveRecordKeeping({ ...base, recordKeepingMode: 'audit', requireScanToPost: false, blockPostingOnErrors: false });
  assert.deepEqual(controls, { mode: 'audit', keepScan: true, requireScanToPost: true, blockPostingOnErrors: true });
});

test('Custom mode follows the saved switches', () => {
  const off = resolveRecordKeeping({ ...base, recordKeepingMode: 'custom', keepScan: false, requireScanToPost: false, blockPostingOnErrors: false });
  assert.deepEqual(off, { mode: 'custom', keepScan: false, requireScanToPost: false, blockPostingOnErrors: false });

  const on = resolveRecordKeeping({ ...base, recordKeepingMode: 'custom', keepScan: true, requireScanToPost: true, blockPostingOnErrors: true });
  assert.deepEqual(on, { mode: 'custom', keepScan: true, requireScanToPost: true, blockPostingOnErrors: true });
});

test('requiring a scan in Custom mode always keeps a scan', () => {
  const controls = resolveRecordKeeping({ ...base, recordKeepingMode: 'custom', keepScan: false, requireScanToPost: true, blockPostingOnErrors: false });
  assert.equal(controls.keepScan, true);
});

test('invalid saved modes fall back to Simple', () => {
  assert.equal(normalizeReceiptOcrSettings({ recordKeepingMode: 'strict' }).recordKeepingMode, 'simple');
  assert.equal(normalizeReceiptOcrSettings({ recordKeepingMode: 'audit' }).recordKeepingMode, 'audit');
  assert.equal(normalizeReceiptOcrSettings({ keepScan: false }).keepScan, false);
});

test('posting is blocked only when the active controls say so', () => {
  const simple = resolveRecordKeeping({ ...base, recordKeepingMode: 'simple' });
  assert.equal(postingBlockReason(simple, {}, ['Total amount is required.']), '', 'warnings only in Simple mode');

  const audit = resolveRecordKeeping({ ...base, recordKeepingMode: 'audit' });
  assert.match(postingBlockReason(audit, {}, []), /scan/i);
  assert.equal(postingBlockReason(audit, { storagePath: 'receipts/o/r/a.pdf' }, []), '');
  assert.equal(postingBlockReason(audit, { storagePath: 'receipts/o/r/a.pdf' }, ['Total amount is required.']), 'Total amount is required.');
});

test('mode changes are logged with who, when and what changed', () => {
  const simple = { recordKeepingMode: 'simple' as const, keepScan: true, requireScanToPost: false, blockPostingOnErrors: false };
  const audit = { ...simple, recordKeepingMode: 'audit' as const };

  assert.equal(buildRecordKeepingLogEntry(simple, simple, { userId: 'u1' }), null, 'no change, no entry');

  const entry = buildRecordKeepingLogEntry(simple, audit, { userId: 'u1', name: 'Dan' }, new Date('2026-10-31T12:00:00Z'));
  assert.ok(entry);
  assert.equal(entry.at, '2026-10-31T12:00:00.000Z');
  assert.equal(entry.byUserId, 'u1');
  assert.equal(entry.byName, 'Dan');
  assert.equal(entry.fromMode, 'simple');
  assert.equal(entry.toMode, 'audit');
  assert.ok(entry.changes.some((line) => /Mode changed to Audit-ready/.test(line)));
  assert.ok(entry.changes.some((line) => /Require a scan before posting: on/.test(line)));
  assert.ok(entry.changes.some((line) => /Block posting while a receipt has errors: on/.test(line)));
});

test('switching an unused Custom switch is not logged as a control change', () => {
  const simple = { recordKeepingMode: 'simple' as const, keepScan: true, requireScanToPost: false, blockPostingOnErrors: false };
  const sameEffect = { ...simple, requireScanToPost: true, blockPostingOnErrors: true };
  assert.equal(buildRecordKeepingLogEntry(simple, sameEffect, { userId: 'u1' }), null, 'Simple ignores the saved switches');
});

test('the paper filing list is sorted by number and escapes CSV characters', () => {
  const csv = buildPaperFilingCsv([
    { auditReferenceId: 'REC-20261031-002', transactionDate: '2026-10-17', merchantName: 'Cafe, Roma', totalAmount: 59.2, paperLocation: 'Box 3, "2026"', status: 'posted' },
    { auditReferenceId: 'REC-20261031-001', transactionDate: '2026-10-16', proposedCompany: 'Northstar', totalAmount: 172.14, status: 'queued' },
  ]);
  const lines = csv.split('\r\n');
  assert.equal(lines[0], 'Document #,Date,Vendor,Total,Filed at,Status');
  assert.equal(lines[1], 'REC-20261031-001,2026-10-16,Northstar,172.14,,queued');
  assert.equal(lines[2], 'REC-20261031-002,2026-10-17,"Cafe, Roma",59.20,"Box 3, ""2026""",posted');
});
