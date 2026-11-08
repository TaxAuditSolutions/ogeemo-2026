import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_DEDUCTION_RATE_PERCENT,
  calculateDeductions,
  isValidDeductionPercent,
  normalizeDeductionPercent,
} from '../src/lib/payroll-deductions';
import {
  DEFAULT_PAYROLL_SETTINGS,
  needsPayrollSetup,
  normalizePayrollSettings,
  validatePayrollSettings,
} from '../src/lib/payroll-settings';

test('the default deduction rate is 20%', () => {
  assert.equal(DEFAULT_DEDUCTION_RATE_PERCENT, 20);
  assert.equal(DEFAULT_PAYROLL_SETTINGS.deductionRatePercent, 20);
  assert.deepEqual(calculateDeductions(1000, DEFAULT_DEDUCTION_RATE_PERCENT), { deductions: 200, netPay: 800 });
});

test('deductions follow whatever rate is set, to the cent', () => {
  assert.deepEqual(calculateDeductions(1000, 15), { deductions: 150, netPay: 850 });
  assert.deepEqual(calculateDeductions(1000, 0), { deductions: 0, netPay: 1000 });
  assert.deepEqual(calculateDeductions(1000, 100), { deductions: 1000, netPay: 0 });
  assert.deepEqual(calculateDeductions(958.9, 22.5), { deductions: 215.75, netPay: 743.15 });
  assert.deepEqual(calculateDeductions(1234.56, 18.25), { deductions: 225.31, netPay: 1009.25 });
});

test('deductions plus net pay always equal gross pay', () => {
  for (const gross of [0.01, 99.99, 958.9, 1234.56, 5000, 73000]) {
    for (const rate of [0, 5, 12.5, 20, 33.33, 100]) {
      const { deductions, netPay } = calculateDeductions(gross, rate);
      assert.equal(Math.round((deductions + netPay) * 100) / 100, gross, `${gross} @ ${rate}%`);
    }
  }
});

test('bad rates fall back to the default and out-of-range rates are clamped', () => {
  assert.equal(normalizeDeductionPercent(''), 20);
  assert.equal(normalizeDeductionPercent(undefined), 20);
  assert.equal(normalizeDeductionPercent(null), 20);
  assert.equal(normalizeDeductionPercent('abc'), 20);
  assert.equal(normalizeDeductionPercent(NaN), 20);
  assert.equal(normalizeDeductionPercent(-5), 0);
  assert.equal(normalizeDeductionPercent(150), 100);
  assert.equal(normalizeDeductionPercent('12.345'), 12.35);
  assert.equal(normalizeDeductionPercent(0), 0, 'zero is a real choice, not "missing"');
});

test('gross pay that is negative or not a number never produces negative deductions', () => {
  assert.deepEqual(calculateDeductions(-100, 20), { deductions: 0, netPay: 0 });
  assert.deepEqual(calculateDeductions(NaN, 20), { deductions: 0, netPay: 0 });
});

test('isValidDeductionPercent accepts 0-100 only and rejects blanks', () => {
  assert.equal(isValidDeductionPercent('0'), true);
  assert.equal(isValidDeductionPercent('20'), true);
  assert.equal(isValidDeductionPercent('100'), true);
  assert.equal(isValidDeductionPercent('100.01'), false);
  assert.equal(isValidDeductionPercent('-1'), false);
  assert.equal(isValidDeductionPercent(''), false);
  assert.equal(isValidDeductionPercent('abc'), false);
  assert.equal(isValidDeductionPercent(undefined), false);
});

test('stored settings are cleaned: nothing, junk and partial values fall back safely', () => {
  assert.deepEqual(normalizePayrollSettings(undefined), DEFAULT_PAYROLL_SETTINGS);
  assert.deepEqual(normalizePayrollSettings('junk'), DEFAULT_PAYROLL_SETTINGS);
  const partial = normalizePayrollSettings({ paySchedule: 'monthly', deductionRatePercent: 12 });
  assert.equal(partial.paySchedule, 'monthly');
  assert.equal(partial.deductionRatePercent, 12);
  assert.equal(partial.periodStartDay, 1);
  const bad = normalizePayrollSettings({ paySchedule: 'yearly', periodStartDay: 9, biweeklyAnchor: '2026-02-30', deductionRatePercent: 'x' });
  assert.equal(bad.paySchedule, 'bi-weekly');
  assert.equal(bad.periodStartDay, 1);
  assert.equal(bad.biweeklyAnchor, null);
  assert.equal(bad.deductionRatePercent, 20);
});

test('a saved zero percent deduction is kept, not reset to 20', () => {
  assert.equal(normalizePayrollSettings({ paySchedule: 'monthly', deductionRatePercent: 0 }).deductionRatePercent, 0);
});

test('settings validation: bi-weekly needs an anchor and the rate must be 0-100', () => {
  const ok = { ...DEFAULT_PAYROLL_SETTINGS, biweeklyAnchor: '2026-11-02' };
  assert.equal(validatePayrollSettings(ok), null);
  assert.match(validatePayrollSettings({ ...ok, biweeklyAnchor: null }) ?? '', /first day of one of your pay periods/);
  assert.equal(validatePayrollSettings({ ...ok, paySchedule: 'monthly', biweeklyAnchor: null }), null, 'anchor only matters for bi-weekly');
  assert.match(validatePayrollSettings({ ...ok, deductionRatePercent: 101 }) ?? '', /between 0 and 100/);
  assert.match(validatePayrollSettings({ ...ok, deductionRatePercent: -1 }) ?? '', /between 0 and 100/);
  assert.match(validatePayrollSettings({ ...ok, deductionRatePercent: NaN }) ?? '', /between 0 and 100/);
});

test('a workspace with no saved pay schedule is asked to set one up', () => {
  assert.equal(needsPayrollSetup(undefined), true);
  assert.equal(needsPayrollSetup({}), true);
  assert.equal(needsPayrollSetup({ paySchedule: 'nonsense' }), true);
  assert.equal(needsPayrollSetup({ paySchedule: 'weekly' }), false);
});
