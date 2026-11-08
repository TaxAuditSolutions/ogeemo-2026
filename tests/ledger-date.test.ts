// Canadian time zone on purpose: this is where "2026-10-01" read as UTC lands on 30 September.
process.env.TZ = 'America/Toronto';

import assert from 'node:assert/strict';
import test from 'node:test';

import { isLedgerDateInRange, parseLedgerDate, todayDateKey } from '../src/lib/ledger-date';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

test('the test process really runs in a Canadian time zone', () => {
  assert.equal(new Date(2026, 0, 1).getTimezoneOffset(), 300);
});

test('the old way (new Date on the text) put 1 October into September here', () => {
  assert.equal(new Date('2026-10-01').getMonth(), 8, 'UTC midnight is the evening of 30 September locally');
  assert.equal(parseLedgerDate('2026-10-01')!.getMonth(), 9, 'the fixed reader keeps it in October');
});

test('parseLedgerDate reads the stored day as a local calendar day', () => {
  const parsed = parseLedgerDate('2026-12-31')!;
  assert.deepEqual([parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), parsed.getHours()], [2026, 11, 31, 0]);
  assert.equal(parseLedgerDate('2026-12-31T23:59:59.000Z')!.getDate(), 31, 'a time suffix does not move the day');
});

test('parseLedgerDate refuses text that is not a real day', () => {
  for (const bad of ['', 'banana', '2026-02-30', '2026-13-01', '10/01/2026', undefined, null, 20261001, NaN as any]) {
    assert.equal(parseLedgerDate(bad), null, String(bad));
  }
  assert.equal(parseLedgerDate(new Date('nope')), null);
  assert.equal(parseLedgerDate(d(2028, 2, 29))!.getDate(), 29, 'leap day is real');
});

test('a quarter includes its first and last day and excludes the days either side', () => {
  const from = d(2026, 10, 1);
  const to = d(2026, 12, 31);
  const inRange = (day: string) => isLedgerDateInRange(day, from, to);
  assert.equal(inRange('2026-09-30'), false);
  assert.equal(inRange('2026-10-01'), true, 'first day');
  assert.equal(inRange('2026-12-31'), true, 'last day');
  assert.equal(inRange('2027-01-01'), false);
});

test('the same entry is never counted in two adjacent quarters', () => {
  const quarters: [Date, Date][] = [
    [d(2026, 1, 1), d(2026, 3, 31)],
    [d(2026, 4, 1), d(2026, 6, 30)],
    [d(2026, 7, 1), d(2026, 9, 30)],
    [d(2026, 10, 1), d(2026, 12, 31)],
  ];
  for (let offset = 0; offset < 365; offset++) {
    const day = new Date(2026, 0, 1 + offset);
    const key = todayDateKey(day);
    const hits = quarters.filter(([from, to]) => isLedgerDateInRange(key, from, to)).length;
    assert.equal(hits, 1, `${key} must fall in exactly one quarter`);
  }
});

test('with a one-day range only that day matches; with no range everything matches', () => {
  assert.equal(isLedgerDateInRange('2026-11-08', d(2026, 11, 8), d(2026, 11, 8)), true);
  assert.equal(isLedgerDateInRange('2026-11-09', d(2026, 11, 8), d(2026, 11, 8)), false);
  assert.equal(isLedgerDateInRange('2026-11-08', undefined, undefined), true);
  assert.equal(isLedgerDateInRange('garbage', undefined, undefined), true);
});

test('open-ended ranges work, and an unreadable date is out of any real range', () => {
  assert.equal(isLedgerDateInRange('2026-05-01', d(2026, 1, 1), undefined), true);
  assert.equal(isLedgerDateInRange('2025-12-31', d(2026, 1, 1), undefined), false);
  assert.equal(isLedgerDateInRange('2030-01-01', undefined, d(2026, 12, 31)), false);
  assert.equal(isLedgerDateInRange('garbage', d(2026, 1, 1), d(2026, 12, 31)), false);
  assert.equal(isLedgerDateInRange(undefined, d(2026, 1, 1), d(2026, 12, 31)), false);
});

test('a range whose end carries a clock time still includes that whole day', () => {
  const to = new Date(2026, 11, 31, 23, 59, 59, 999);
  assert.equal(isLedgerDateInRange('2026-12-31', d(2026, 10, 1), to), true);
  const early = new Date(2026, 11, 31, 0, 0, 0, 0);
  assert.equal(isLedgerDateInRange('2026-12-31', d(2026, 10, 1), early), true);
});

test('todayDateKey is the local day: late evening is still today, not tomorrow', () => {
  assert.equal(todayDateKey(new Date(2026, 10, 8, 23, 30)), '2026-11-08');
  assert.equal(todayDateKey(new Date(2026, 0, 1, 0, 5)), '2026-01-01');
  assert.notEqual(new Date(2026, 10, 8, 23, 30).toISOString().slice(0, 10), '2026-11-08', 'sanity: the UTC date is already tomorrow');
});
