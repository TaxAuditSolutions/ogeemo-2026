import assert from 'node:assert/strict';
import test from 'node:test';

import {
  STABLE_BANK_ID_RE,
  detectDateOrder,
  parseBankAmount,
  parseBankCsv,
  parseBankDate,
  splitCsvLine,
} from '../src/lib/bank-csv';

test('amounts: dollar signs, commas, brackets and trailing minus are all read as the right sign', () => {
  assert.equal(parseBankAmount('$1,234.56'), 1234.56);
  assert.equal(parseBankAmount('-12.50'), -12.5);
  assert.equal(parseBankAmount('(12.50)'), -12.5);
  assert.equal(parseBankAmount('12.50-'), -12.5);
  assert.equal(parseBankAmount('+7'), 7);
  assert.equal(parseBankAmount('.99'), 0.99);
  assert.equal(parseBankAmount('0.00'), 0);
  assert.equal(parseBankAmount('1.005'), 1.01, 'to the cent');
});

test('amounts that are not numbers are refused, never silently zero', () => {
  for (const bad of ['', '   ', 'abc', '12abc', '1.2.3', '--5', undefined, null, 'N/A']) {
    assert.equal(parseBankAmount(bad as any), null, String(bad));
  }
});

test('dates: ISO, month/day, day/month and written months', () => {
  assert.equal(parseBankDate('2026-10-01'), '2026-10-01');
  assert.equal(parseBankDate('10/01/2026', 'mdy'), '2026-10-01');
  assert.equal(parseBankDate('10/01/2026', 'dmy'), '2026-01-10');
  assert.equal(parseBankDate('2026/10/01'), '2026-10-01');
  assert.equal(parseBankDate('Oct 1, 2026'), '2026-10-01');
  assert.equal(parseBankDate('1 Oct 2026'), '2026-10-01');
  assert.equal(parseBankDate('25/12/2026', 'dmy'), '2026-12-25');
});

test('dates that are not real are refused', () => {
  for (const bad of ['', 'x', '2026-02-30', '13/13/2026', '31/04/2026', '00/00/0000', undefined]) {
    assert.equal(parseBankDate(bad as any), null, String(bad));
  }
  assert.equal(parseBankDate('29/02/2028', 'dmy'), '2028-02-29', 'leap day');
  assert.equal(parseBankDate('29/02/2027', 'dmy'), null);
});

test('day-first and month-first files are told apart when any date settles it', () => {
  assert.deepEqual(detectDateOrder(['25/12/2026', '03/04/2026']), { order: 'dmy', ambiguous: 0 });
  assert.deepEqual(detectDateOrder(['12/25/2026', '03/04/2026']), { order: 'mdy', ambiguous: 0 });
  assert.deepEqual(detectDateOrder(['03/04/2026', '05/06/2026', '07/08/2026']), { order: 'mdy', ambiguous: 3 });
  assert.deepEqual(detectDateOrder(['05/05/2026']), { order: 'mdy', ambiguous: 0 }, 'same both ways is not ambiguous');
});

test('CSV lines: quoted commas and doubled quotes stay inside their cell', () => {
  assert.deepEqual(splitCsvLine('2026-10-01,DEBIT,"ACME, INC.","said ""hi""",-5.00'), ['2026-10-01', 'DEBIT', 'ACME, INC.', 'said "hi"', '-5.00']);
  assert.deepEqual(splitCsvLine('a,,c'), ['a', '', 'c']);
});

test('a statement is read: header skipped, rows parsed, bad rows reported with their line number', () => {
  const csv = ['Date,Type,Name,Memo,Amount', '2026-10-01,DEBIT,Acme,"Invoice, Oct",-113.00', '2026-10-02,CREDIT,Client,Payment,500', 'nonsense,CREDIT,X,Y,5', '2026-10-03,DEBIT,Shop,Pens,abc', ''].join('\n');
  const result = parseBankCsv(csv);
  assert.equal(result.rows.length, 2);
  assert.deepEqual(result.rows.map((row) => [row.date, row.name, row.memo, row.amount]), [
    ['2026-10-01', 'Acme', 'Invoice, Oct', -113],
    ['2026-10-02', 'Client', 'Payment', 500],
  ]);
  assert.deepEqual(result.skipped.map((s) => s.line), [4, 5]);
  assert.match(result.skipped[0].reason, /not a valid date/);
  assert.match(result.skipped[1].reason, /not a number/);
});

test('a file with no header does not lose its first row', () => {
  const result = parseBankCsv('2026-10-01,DEBIT,Acme,Pens,-5.00\n2026-10-02,DEBIT,Shop,Ink,-9.00');
  assert.equal(result.rows.length, 2);
});

test('row ids are stable: uploading the same statement twice gives the same ids', () => {
  const csv = '2026-10-01,DEBIT,Acme,Pens,-5.00\n2026-10-02,CREDIT,Client,Pay,50.00';
  const first = parseBankCsv(csv).rows.map((row) => row.id);
  const second = parseBankCsv(csv).rows.map((row) => row.id);
  assert.deepEqual(first, second);
  for (const id of first) assert.match(id, STABLE_BANK_ID_RE);
});

test('two identical transactions on one day stay two distinct rows', () => {
  const csv = '2026-10-01,DEBIT,Cafe,Coffee,-4.50\n2026-10-01,DEBIT,Cafe,Coffee,-4.50';
  const { rows } = parseBankCsv(csv);
  assert.equal(rows.length, 2);
  assert.notEqual(rows[0].id, rows[1].id);
  assert.deepEqual(parseBankCsv(csv).rows.map((row) => row.id), rows.map((row) => row.id));
});

test('different rows do not share an id', () => {
  const ids = parseBankCsv('2026-10-01,D,A,x,-1\n2026-10-01,D,A,x,-2\n2026-10-02,D,A,x,-1\n2026-10-01,D,B,x,-1').rows.map((r) => r.id);
  assert.equal(new Set(ids).size, 4);
});

test('Windows line endings and day-first dates are handled', () => {
  const result = parseBankCsv('Date,Type,Name,Memo,Amount\r\n25/12/2026,CREDIT,Gift,,100\r\n03/01/2026,DEBIT,Shop,,-5\r\n');
  assert.equal(result.dateOrder, 'dmy');
  assert.deepEqual(result.rows.map((row) => row.date), ['2026-12-25', '2026-01-03']);
});

test('ambiguous dates are reported so the page can warn', () => {
  const result = parseBankCsv('03/04/2026,D,A,,-5\n05/06/2026,D,B,,-6');
  assert.equal(result.ambiguousDates, 2);
  assert.equal(result.dateOrder, 'mdy');
});

test('an empty file gives no rows and no errors', () => {
  assert.deepEqual(parseBankCsv('').rows, []);
  assert.deepEqual(parseBankCsv('Date,Type,Name,Memo,Amount').rows, []);
});
