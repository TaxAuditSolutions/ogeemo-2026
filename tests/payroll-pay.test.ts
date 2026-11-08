import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateGrossPay, periodDays, yearFraction } from '../src/lib/payroll-pay';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

test('periodDays counts both the first and last day', () => {
  assert.equal(periodDays(d(2026, 11, 1), d(2026, 11, 1)), 1);
  assert.equal(periodDays(d(2026, 11, 1), d(2026, 11, 7)), 7);
  assert.equal(periodDays(d(2026, 11, 1), d(2026, 11, 30)), 30);
  assert.equal(periodDays(d(2026, 11, 7), d(2026, 11, 1)), 0, 'end before start is empty');
});

test('a full calendar year is exactly one year, leap or not', () => {
  assert.equal(yearFraction(d(2026, 1, 1), d(2026, 12, 31)), 1);
  assert.equal(yearFraction(d(2028, 1, 1), d(2028, 12, 31)), 1, '2028 is a leap year');
});

test('a salaried worker is paid for exactly the selected period, not half the salary', () => {
  const salary = 73000; // 73,000 / 365 = 200 per day in 2026
  const pay = (start: Date, end: Date) => calculateGrossPay({ payType: 'salary', rate: salary, hoursWorked: 0, periodStart: start, periodEnd: end });

  assert.equal(pay(d(2026, 11, 1), d(2026, 11, 1)), 200, 'one day');
  assert.equal(pay(d(2026, 11, 1), d(2026, 11, 7)), 1400, 'one week');
  assert.equal(pay(d(2026, 11, 1), d(2026, 11, 14)), 2800, 'a fortnight');
  assert.equal(pay(d(2026, 11, 1), d(2026, 11, 30)), 6000, 'November (30 days)');
  assert.equal(pay(d(2026, 12, 1), d(2026, 12, 31)), 6200, 'December (31 days) pays more than November');
  assert.equal(pay(d(2026, 1, 1), d(2026, 12, 31)), 73000, 'a full year pays the whole salary');
});

test('the old behaviour (half of annual salary for any period) is gone', () => {
  const week = calculateGrossPay({ payType: 'salary', rate: 73000, hoursWorked: 0, periodStart: d(2026, 11, 1), periodEnd: d(2026, 11, 7) });
  assert.notEqual(week, 36500);
});

test('a period that crosses New Year is prorated per calendar year', () => {
  // 2026 has 365 days, 2027 has 365: 3 days in each year.
  const pay = calculateGrossPay({ payType: 'salary', rate: 73000, hoursWorked: 0, periodStart: d(2026, 12, 29), periodEnd: d(2027, 1, 3) });
  assert.equal(pay, 1200);
});

test('leap years use their own length', () => {
  // 2028 has 366 days: 366,000 / 366 = 1,000 per day.
  const pay = calculateGrossPay({ payType: 'salary', rate: 366000, hoursWorked: 0, periodStart: d(2028, 2, 28), periodEnd: d(2028, 3, 1) });
  assert.equal(pay, 3000, '28 Feb, 29 Feb and 1 Mar');
});

test('pay is rounded to the cent', () => {
  const pay = calculateGrossPay({ payType: 'salary', rate: 50000, hoursWorked: 0, periodStart: d(2026, 11, 1), periodEnd: d(2026, 11, 7) });
  assert.equal(pay, 958.9); // 50,000 x 7 / 365 = 958.9041...
});

test('hourly pay is hours times rate and ignores the period length', () => {
  const pay = calculateGrossPay({ payType: 'hourly', rate: 25, hoursWorked: 37.5, periodStart: d(2026, 11, 1), periodEnd: d(2026, 11, 7) });
  assert.equal(pay, 937.5);
  assert.equal(calculateGrossPay({ payType: 'hourly', rate: 25, hoursWorked: 0, periodStart: d(2026, 11, 1), periodEnd: d(2026, 11, 7) }), 0);
});

test('a rate typed as text still works, and missing or bad values pay nothing', () => {
  assert.equal(calculateGrossPay({ payType: 'hourly', rate: '20', hoursWorked: 2, periodStart: undefined, periodEnd: undefined }), 40);
  assert.equal(calculateGrossPay({ payType: 'hourly', rate: undefined, hoursWorked: 8, periodStart: undefined, periodEnd: undefined }), 0);
  assert.equal(calculateGrossPay({ payType: 'salary', rate: 0, hoursWorked: 0, periodStart: d(2026, 11, 1), periodEnd: d(2026, 11, 7) }), 0);
  assert.equal(calculateGrossPay({ payType: 'salary', rate: 'abc', hoursWorked: 0, periodStart: d(2026, 11, 1), periodEnd: d(2026, 11, 7) }), 0);
  assert.equal(calculateGrossPay({ payType: 'hourly', rate: 25, hoursWorked: -5, periodStart: undefined, periodEnd: undefined }), 0, 'negative hours never reduce pay');
});

test('a salaried worker with no period selected yet is paid nothing, and an inverted period too', () => {
  assert.equal(calculateGrossPay({ payType: 'salary', rate: 73000, hoursWorked: 0, periodStart: undefined, periodEnd: undefined }), 0);
  assert.equal(calculateGrossPay({ payType: 'salary', rate: 73000, hoursWorked: 0, periodStart: d(2026, 11, 7), periodEnd: d(2026, 11, 1) }), 0);
});

test('a worker with no pay type set is treated as salaried, as before', () => {
  assert.equal(calculateGrossPay({ payType: null, rate: 73000, hoursWorked: 0, periodStart: d(2026, 11, 1), periodEnd: d(2026, 11, 1) }), 200);
});
