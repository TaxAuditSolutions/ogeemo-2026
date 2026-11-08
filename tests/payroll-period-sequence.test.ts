import assert from 'node:assert/strict';
import test from 'node:test';
import { format } from 'date-fns';

import {
  adjacentPayPeriod,
  isStandardPeriod,
  lastCompletedPayPeriod,
  payPeriodContaining,
  type PeriodConfig,
} from '../src/lib/payroll-periods';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);
const key = (date: Date) => format(date, 'yyyy-MM-dd');

const weeklyMon: PeriodConfig = { paySchedule: 'weekly', periodStartDay: 1, biweeklyAnchor: null };
const biweekly: PeriodConfig = { paySchedule: 'bi-weekly', periodStartDay: 1, biweeklyAnchor: '2026-11-02' };
const semi: PeriodConfig = { paySchedule: 'semi-monthly', periodStartDay: 1, biweeklyAnchor: null };
const monthly: PeriodConfig = { paySchedule: 'monthly', periodStartDay: 1, biweeklyAnchor: null };
const all = [weeklyMon, biweekly, semi, monthly];

test('periods are contiguous: no gap and no overlap, for every schedule, across years', () => {
  for (const config of all) {
    let period = payPeriodContaining(d(2026, 11, 20), config)!;
    for (let i = 0; i < 80; i++) {
      const next = adjacentPayPeriod(period, 1, config)!;
      const dayAfter = new Date(period.end.getFullYear(), period.end.getMonth(), period.end.getDate() + 1);
      assert.equal(key(next.start), key(dayAfter), `${config.paySchedule}: period ${i} is not followed directly`);
      assert.ok(next.end >= next.start);
      period = next;
    }
  }
});

test('stepping forward then back returns to the same period', () => {
  for (const config of all) {
    const here = payPeriodContaining(d(2027, 6, 15), config)!;
    const there = adjacentPayPeriod(adjacentPayPeriod(here, 1, config)!, -1, config)!;
    assert.equal(key(there.start), key(here.start), config.paySchedule);
    assert.equal(key(there.end), key(here.end), config.paySchedule);
  }
});

test('every date belongs to exactly one period, and that period contains it', () => {
  for (const config of all) {
    for (let i = 0; i < 120; i++) {
      const date = d(2026, 11, 1 + i);
      const period = payPeriodContaining(date, config)!;
      assert.ok(date >= period.start && date <= period.end, `${key(date)} outside its period (${config.paySchedule})`);
    }
  }
});

test('the last completed period is the one before the current one', () => {
  const last = lastCompletedPayPeriod(d(2026, 11, 20), biweekly)!;
  assert.equal(`${key(last.start)}..${key(last.end)}`, '2026-11-02..2026-11-15');
  assert.equal(key(lastCompletedPayPeriod(d(2026, 11, 20), monthly)!.start), '2026-10-01');
  assert.equal(lastCompletedPayPeriod(d(2026, 11, 20), { ...biweekly, biweeklyAnchor: null }), null);
});

test('isStandardPeriod tells a whole pay period from custom dates', () => {
  assert.equal(isStandardPeriod(d(2026, 11, 2), d(2026, 11, 15), biweekly), true);
  assert.equal(isStandardPeriod(d(2026, 11, 3), d(2026, 11, 16), biweekly), false, 'shifted by a day');
  assert.equal(isStandardPeriod(d(2026, 11, 2), d(2026, 11, 8), biweekly), false, 'half a period');
  assert.equal(isStandardPeriod(d(2026, 11, 1), d(2026, 11, 30), monthly), true);
});
