import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPayrollRunCsv, deductionPercent, formatAddress } from '../src/lib/payroll-report';
import {
  alreadyPaid,
  alreadyPaidMessage,
  newestFirst,
  periodsOverlap,
  yearToDate,
} from '../src/lib/payroll-history';

const alice = { employeeId: 'a', employeeName: 'Alice Johnson', grossPay: 1000, deductions: 200, netPay: 800 };
const bob = { employeeId: 'b', employeeName: 'Bob Williams', grossPay: 500, deductions: 100, netPay: 400 };

const run = (id: string, start: string, end: string, payDate: string, details: any[], createdAtMs = 0) => ({
  id, periodStart: start, periodEnd: end, payDate, createdAtMs, details,
});

const runs = [
  run('r1', '2026-01-01', '2026-01-15', '2026-01-20', [alice, bob]),
  run('r2', '2026-01-16', '2026-01-31', '2026-02-05', [alice]),
  run('r3', '2026-02-01', '2026-02-15', '2026-02-20', [alice, bob]),
  run('old', '2025-12-01', '2025-12-15', '2025-12-20', [alice]),
];

test('history lists the newest run first', () => {
  assert.deepEqual(newestFirst(runs).map((r) => r.id), ['r3', 'r2', 'r1', 'old']);
});

test('year to date is this run plus the earlier runs of the same calendar year', () => {
  const second = yearToDate(runs, runs[1], alice);
  assert.deepEqual(second, { grossPay: 2000, deductions: 400, netPay: 1600, runs: 2 });
  const third = yearToDate(runs, runs[2], alice);
  assert.deepEqual([third.grossPay, third.runs], [3000, 3]);
});

test('last year is not counted, and a later run is not counted in an earlier stub', () => {
  assert.equal(yearToDate(runs, runs[0], alice).grossPay, 1000);
  assert.equal(yearToDate(runs, runs[3], alice).grossPay, 1000); // December 2025 only
});

test('a worker not in a run adds nothing to year to date', () => {
  const result = yearToDate(runs, runs[2], bob);
  assert.deepEqual([result.grossPay, result.runs], [1000, 2]);
});

test('workers are matched by id, or by name when there is no id', () => {
  const legacy = [run('l1', '2026-03-01', '2026-03-15', '2026-03-20', [{ employeeName: ' alice johnson ', grossPay: 700, deductions: 140, netPay: 560 }])];
  assert.equal(yearToDate(legacy, legacy[0], { employeeName: 'Alice Johnson' }).grossPay, 700);
  assert.equal(yearToDate(legacy, legacy[0], { employeeId: 'zzz', employeeName: 'Alice Johnson' }).grossPay, 700);
});

test('two runs on the same pay date count in the order they were saved', () => {
  const same = [
    run('x1', '2026-04-01', '2026-04-15', '2026-04-20', [alice], 100),
    run('x2', '2026-04-16', '2026-04-30', '2026-04-20', [alice], 200),
  ];
  assert.equal(yearToDate(same, same[0], alice).grossPay, 1000);
  assert.equal(yearToDate(same, same[1], alice).grossPay, 2000);
});

test('periods overlap when they share a day, including the edges', () => {
  assert.equal(periodsOverlap('2026-01-01', '2026-01-15', '2026-01-15', '2026-01-31'), true);
  assert.equal(periodsOverlap('2026-01-01', '2026-01-15', '2026-01-16', '2026-01-31'), false);
  assert.equal(periodsOverlap('2026-01-05', '2026-01-10', '2026-01-01', '2026-01-31'), true);
});

test('a worker already paid for an overlapping period is refused, a different worker is not', () => {
  const clashes = alreadyPaid(runs, { start: '2026-01-10', end: '2026-01-20' }, [alice, { employeeId: 'c', employeeName: 'Carol' }]);
  assert.deepEqual(clashes.map((c) => c.employeeName), ['Alice Johnson']);
  assert.equal(alreadyPaid(runs, { start: '2026-03-01', end: '2026-03-15' }, [alice, bob]).length, 0);
  assert.equal(alreadyPaid(runs, { start: '2026-01-01', end: '2026-01-15' }, [{ employeeId: 'c', employeeName: 'Carol' }]).length, 0);
});

test('the refusal names who and when, and shortens a long list', () => {
  const one = alreadyPaidMessage([{ employeeName: 'Alice', periodStart: '2026-01-01', periodEnd: '2026-01-15' }]);
  assert.match(one, /Alice \(2026-01-01 to 2026-01-15\)/);
  const many = alreadyPaidMessage(Array.from({ length: 5 }, (_, i) => ({ employeeName: `W${i}`, periodStart: 'a', periodEnd: 'b' })));
  assert.match(many, /and 2 more/);
});

test('the CSV has a row per worker and totals to the cent, quoting names that need it', () => {
  const csv = buildPayrollRunCsv(runs[0], [alice, { employeeName: 'Smith, Bob "BJ"', grossPay: 0.1 + 0.2, deductions: 0.06, netPay: 0.24 }]).split('\r\n');
  assert.equal(csv[0], 'Employee,Pay period start,Pay period end,Pay date,Gross pay,Deductions,Net pay');
  assert.equal(csv[1], 'Alice Johnson,2026-01-01,2026-01-15,2026-01-20,1000.00,200.00,800.00');
  assert.equal(csv[2], '"Smith, Bob ""BJ""",2026-01-01,2026-01-15,2026-01-20,0.30,0.06,0.24');
  assert.equal(csv[3], 'Total,2026-01-01,2026-01-15,2026-01-20,1000.30,200.06,800.24');
});

test('deductions as a percentage of gross, none when there is no gross', () => {
  assert.equal(deductionPercent(1000, 200), 20);
  assert.equal(deductionPercent(333.33, 66.67), 20);
  assert.equal(deductionPercent(0, 0), null);
});

test('an address is one line with blank parts skipped', () => {
  assert.equal(formatAddress(['12 Main St', 'Barrie', 'ON', 'L4M 1A1', 'Canada']), '12 Main St, Barrie, ON, L4M 1A1, Canada');
  assert.equal(formatAddress(['  ', undefined, null, 'Barrie']), 'Barrie');
  assert.equal(formatAddress([]), '');
});