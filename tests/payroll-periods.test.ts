import assert from 'node:assert/strict';
import test from 'node:test';
import { format } from 'date-fns';

import { parseDateKey, payPeriodContaining, type PeriodConfig } from '../src/lib/payroll-periods';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);
const key = (date: Date) => format(date, 'yyyy-MM-dd');
const span = (date: Date, config: PeriodConfig) => {
  const period = payPeriodContaining(date, config);
  return period ? `${key(period.start)}..${key(period.end)}` : 'none';
};

const weeklyMon: PeriodConfig = { paySchedule: 'weekly', periodStartDay: 1, biweeklyAnchor: null };
const biweekly: PeriodConfig = { paySchedule: 'bi-weekly', periodStartDay: 1, biweeklyAnchor: '2026-11-02' };
const semi: PeriodConfig = { paySchedule: 'semi-monthly', periodStartDay: 1, biweeklyAnchor: null };
const monthly: PeriodConfig = { paySchedule: 'monthly', periodStartDay: 1, biweeklyAnchor: null };

test('weekly periods start on the chosen weekday and run 7 days', () => {
  // 2026-11-04 is a Wednesday; its Monday-start week is 2 - 8 Nov.
  assert.equal(span(d(2026, 11, 4), weeklyMon), '2026-11-02..2026-11-08');
  assert.equal(span(d(2026, 11, 2), weeklyMon), '2026-11-02..2026-11-08', 'the start day itself');
  assert.equal(span(d(2026, 11, 8), weeklyMon), '2026-11-02..2026-11-08', 'the last day');
  assert.equal(span(d(2026, 11, 4), { ...weeklyMon, periodStartDay: 0 }), '2026-11-01..2026-11-07', 'Sunday start');
  assert.equal(span(d(2026, 11, 4), { ...weeklyMon, periodStartDay: 5 }), '2026-10-30..2026-11-05', 'Friday start');
});

test('bi-weekly periods are 14 days and stay in step with the anchor, before and after it', () => {
  assert.equal(span(d(2026, 11, 2), biweekly), '2026-11-02..2026-11-15', 'the anchor period');
  assert.equal(span(d(2026, 11, 15), biweekly), '2026-11-02..2026-11-15');
  assert.equal(span(d(2026, 11, 16), biweekly), '2026-11-16..2026-11-29');
  assert.equal(span(d(2026, 10, 20), biweekly), '2026-10-19..2026-11-01', 'before the anchor');
  assert.equal(span(d(2027, 3, 1), biweekly), '2027-02-22..2027-03-07', 'months later, same cadence');
});

test('bi-weekly without a valid anchor cannot place a date', () => {
  assert.equal(payPeriodContaining(d(2026, 11, 4), { ...biweekly, biweeklyAnchor: null }), null);
  assert.equal(payPeriodContaining(d(2026, 11, 4), { ...biweekly, biweeklyAnchor: 'not-a-date' }), null);
});

test('semi-monthly is the 1st-15th and 16th-end of month, in 28, 29, 30 and 31 day months', () => {
  assert.equal(span(d(2026, 11, 15), semi), '2026-11-01..2026-11-15');
  assert.equal(span(d(2026, 11, 16), semi), '2026-11-16..2026-11-30');
  assert.equal(span(d(2026, 12, 20), semi), '2026-12-16..2026-12-31');
  assert.equal(span(d(2027, 2, 20), semi), '2027-02-16..2027-02-28', 'February');
  assert.equal(span(d(2028, 2, 20), semi), '2028-02-16..2028-02-29', 'leap February');
});

test('monthly is the whole calendar month', () => {
  assert.equal(span(d(2026, 11, 20), monthly), '2026-11-01..2026-11-30');
  assert.equal(span(d(2026, 12, 1), monthly), '2026-12-01..2026-12-31');
  assert.equal(span(d(2028, 2, 10), monthly), '2028-02-01..2028-02-29');
});

test('labels are readable and show both years across New Year', () => {
  assert.equal(payPeriodContaining(d(2026, 11, 4), weeklyMon)!.label, 'Nov 2 - Nov 8, 2026');
  assert.equal(payPeriodContaining(d(2026, 12, 29), weeklyMon)!.label, 'Dec 28, 2026 - Jan 3, 2027');
});

test('parseDateKey accepts real dates only', () => {
  assert.equal(key(parseDateKey('2026-11-02')!), '2026-11-02');
  assert.equal(parseDateKey('2026-02-30'), null, 'no 30 February');
  assert.equal(parseDateKey('2026-13-01'), null);
  assert.equal(parseDateKey('11/02/2026'), null);
  assert.equal(parseDateKey(undefined), null);
  assert.equal(parseDateKey(20261102), null);
});
