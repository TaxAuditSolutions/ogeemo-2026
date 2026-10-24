import assert from 'node:assert/strict';
import test from 'node:test';

import {
  counterDocId,
  DEFAULT_NUMBERING,
  formatBusinessDate,
  formatDocumentNumber,
  isDocumentNumberType,
  isValidBusinessDate,
  normalizeRule,
  validateOverrideNumber,
} from '../src/core/document-numbering';

test('business date is the local date formatted as YYYYMMDD', () => {
  assert.equal(formatBusinessDate(new Date(2026, 0, 5)), '20260105');
  assert.equal(formatBusinessDate(new Date(2026, 11, 31)), '20261231');
  assert.match(formatBusinessDate(new Date()), /^\d{8}$/);
  assert.ok(isValidBusinessDate('20261023'));
  assert.ok(!isValidBusinessDate('2026-10-23'));
  assert.ok(!isValidBusinessDate('2026102'));
});

test('formats PREFIX-YYYYMMDD-sequence with zero padding', () => {
  const rule = { prefix: 'QTE', padding: 3 };
  assert.equal(formatDocumentNumber('QTE', rule, '20261023', 1), 'QTE-20261023-001');
  assert.equal(formatDocumentNumber('QTE', rule, '20261023', 42), 'QTE-20261023-042');
  const wide = { prefix: 'INV', padding: 5 };
  assert.equal(formatDocumentNumber('INV', wide, '20261023', 7), 'INV-20261023-00007');
});

test('sequence grows past the pad width instead of truncating', () => {
  const rule = { prefix: 'INV', padding: 3 };
  assert.equal(formatDocumentNumber('INV', rule, '20261023', 1000), 'INV-20261023-1000');
  assert.equal(formatDocumentNumber('INV', rule, '20261023', 0), 'INV-20261023-001');
});

test('normalizeRule falls back to defaults and clamps padding to 3..6', () => {
  assert.deepEqual(normalizeRule(undefined, DEFAULT_NUMBERING.INV), DEFAULT_NUMBERING.INV);
  assert.deepEqual(normalizeRule({}, DEFAULT_NUMBERING.INV), DEFAULT_NUMBERING.INV);
  assert.deepEqual(normalizeRule({ prefix: 'TAS', padding: 2 }, DEFAULT_NUMBERING.INV), { prefix: 'TAS', padding: 3 });
  assert.deepEqual(normalizeRule({ prefix: 'X', padding: 99 }, DEFAULT_NUMBERING.INV), { prefix: 'X', padding: 6 });
  // Unsafe/empty prefixes fall back to the type default.
  assert.equal(normalizeRule({ prefix: 'bad prefix!', padding: 4 }, DEFAULT_NUMBERING.INV).prefix, 'INV');
  assert.equal(normalizeRule({ prefix: '  tas  ', padding: 4 }, DEFAULT_NUMBERING.INV).prefix, 'tas');
});

test('override validation allows exceptions but rejects garbage', () => {
  assert.deepEqual(validateOverrideNumber('  CUSTOM-77  '), { ok: true, value: 'CUSTOM-77' });
  const empty = validateOverrideNumber('   ');
  assert.ok(!empty.ok);
  const multiline = validateOverrideNumber('INV-1\nsecond');
  assert.ok(!multiline.ok);
  const long = validateOverrideNumber('X'.repeat(41));
  assert.ok(!long.ok);
});

test('counter doc ids are type_date scoped', () => {
  assert.equal(counterDocId('INV', '20261023'), 'INV_20261023');
  assert.equal(counterDocId('REC', '20261231'), 'REC_20261231');
});

test('document type guard accepts only the four registered types', () => {
  assert.ok(isDocumentNumberType('INV'));
  assert.ok(isDocumentNumberType('REC'));
  assert.ok(!isDocumentNumberType('BILL'));
  assert.ok(!isDocumentNumberType('inv'));
});
