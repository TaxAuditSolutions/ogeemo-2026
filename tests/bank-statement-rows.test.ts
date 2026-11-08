import assert from 'node:assert/strict';
import test from 'node:test';

import { parseBankCsv } from '../src/lib/bank-csv';
import { mergeStatementRows, toStatementRow, uploadSummary } from '../src/lib/bank-statement-rows';

const csv = [
  'Date,Type,Name,Memo,Amount',
  '2026-10-01,DEBIT,"Smith, Bob","Lunch, with ""client""",-25.50',
  '2026-10-02,ACH,Client Alpha,Invoice payment,"1,250.00"',
  '2026-10-03,DEBIT,Coffee,,-4.00',
  '2026-10-03,DEBIT,Coffee,,-4.00',
].join('\n');

test('a quoted comma or quote does not shift the columns, and thousands separators are read', () => {
  const parsed = parseBankCsv(csv);
  assert.equal(parsed.rows.length, 4);
  assert.deepEqual([parsed.rows[0].name, parsed.rows[0].memo, parsed.rows[0].amount], ['Smith, Bob', 'Lunch, with "client"', -25.5]);
  assert.equal(parsed.rows[1].amount, 1250);
});

test('two identical rows in one file stay two rows', () => {
  const rows = parseBankCsv(csv).rows.map((r) => toStatementRow(r, 'acc1'));
  assert.equal(new Set(rows.map((r) => r.id)).size, 4);
  assert.equal(mergeStatementRows([], rows).added, 4);
});

test('uploading the same statement to the same account again adds nothing', () => {
  const rows = parseBankCsv(csv).rows.map((r) => toStatementRow(r, 'acc1'));
  const first = mergeStatementRows([], rows);
  const again = mergeStatementRows(first.merged, parseBankCsv(csv).rows.map((r) => toStatementRow(r, 'acc1')));
  assert.deepEqual([again.added, again.duplicates, again.merged.length], [0, 4, 4]);
});

test('the same statement uploaded to a different account is kept', () => {
  const one = mergeStatementRows([], parseBankCsv(csv).rows.map((r) => toStatementRow(r, 'acc1')));
  const two = mergeStatementRows(one.merged, parseBankCsv(csv).rows.map((r) => toStatementRow(r, 'acc2')));
  assert.deepEqual([two.added, two.duplicates, two.merged.length], [4, 0, 8]);
});

test('a row with no type or name gets a plain label, not blank', () => {
  const row = toStatementRow({ id: 'bank_00000001', date: '2026-10-01', type: '', name: '', memo: '', amount: 5 }, 'a');
  assert.deepEqual([row.transactionType, row.name], ['N/A', 'Unknown']);
});

test('the summary says what was added, repeated, skipped and unclear', () => {
  assert.equal(uploadSummary({ rows: [1], skipped: [], ambiguousDates: 0 }, { added: 1, duplicates: 0 }), 'Added 1 transaction.');
  assert.equal(
    uploadSummary(
      { rows: [1, 2, 3], skipped: [{ line: 7, reason: 'bad amount' }], ambiguousDates: 2 },
      { added: 2, duplicates: 3 }
    ),
    'Added 2 transactions. 3 already uploaded for this account were not added again. 1 row skipped (first: line 7, bad amount). 2 dates are ambiguous and read as month/day.'
  );
});

test('a file with only bad rows reports nothing usable instead of adding zero quietly', () => {
  const parsed = parseBankCsv('Date,Type,Name,Memo,Amount\nnot a date,X,Y,,abc');
  assert.equal(parsed.rows.length, 0);
  assert.equal(parsed.skipped.length, 1);
});
