import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPayStub, parsePayStub, workerAddressLine } from '../src/lib/payroll-stub';

const alice = { employeeId: 'a', employeeName: 'Alice Johnson', grossPay: 1000, deductions: 200, netPay: 800 };
const run = (id: string, payDate: string, extra: object = {}) => ({
  id, periodStart: '2026-01-01', periodEnd: '2026-01-15', payDate, details: [alice], ...extra,
});
const runs = [run('r1', '2026-01-20'), run('r2', '2026-02-05', { deductionRatePercent: 22 })];

test('a stub carries the run figures and a real year to date', () => {
  const stub = buildPayStub(runs, runs[1], alice, { name: ' Acme Ltd ', address: '1 Main St' }, '5 Elm St');
  assert.equal(stub.companyName, 'Acme Ltd');
  assert.equal(stub.companyAddress, '1 Main St');
  assert.equal(stub.employeeAddress, '5 Elm St');
  assert.deepEqual([stub.grossPay, stub.deductions, stub.netPay], [1000, 200, 800]);
  assert.deepEqual(stub.ytd, { grossPay: 2000, deductions: 400, netPay: 1600, runs: 2 });
  assert.deepEqual(stub.payPeriod, { from: '2026-01-01', to: '2026-01-15' });
});

test('the deduction percentage is the one the run recorded, else worked out from the amounts', () => {
  assert.equal(buildPayStub(runs, runs[1], alice, {}, '').deductionRatePercent, 22);
  assert.equal(buildPayStub(runs, runs[0], alice, {}, '').deductionRatePercent, 20);
  const none = { ...alice, grossPay: 0, deductions: 0, netPay: 0 };
  assert.equal(buildPayStub([run('z', '2026-03-01', { details: [none] })], run('z', '2026-03-01', { details: [none] }), none, {}, '').deductionRatePercent, null);
});

test('a missing company is blank, never a made-up name or address', () => {
  const stub = buildPayStub(runs, runs[0], alice, {}, '');
  assert.equal(stub.companyName, '');
  assert.equal(stub.companyAddress, '');
  assert.equal(stub.employeeAddress, '');
});

test('a worker address uses the home address first, then the plain fields, and is blank with neither', () => {
  assert.equal(workerAddressLine({ homeAddress: { street: '5 Elm St', city: 'Barrie', provinceState: 'ON' }, streetAddress: 'ignored' }), '5 Elm St, Barrie, ON');
  assert.equal(workerAddressLine({ streetAddress: '9 Oak Rd', city: 'Orillia', postalCode: 'L3V 1A1' }), '9 Oak Rd, Orillia, L3V 1A1');
  assert.equal(workerAddressLine({ homeAddress: {} }), '');
  assert.equal(workerAddressLine(undefined), '');
});

test('stub data read back from storage must really be a stub', () => {
  const stub = buildPayStub(runs, runs[1], alice, { name: 'Acme' }, '');
  assert.deepEqual(parsePayStub(JSON.stringify(stub)), stub);
  assert.equal(parsePayStub(null), null);
  assert.equal(parsePayStub('not json'), null);
  assert.equal(parsePayStub('{"employeeName":"x"}'), null);
  // the old shape (ISO timestamps, no year to date) is not accepted
  assert.equal(parsePayStub(JSON.stringify({ employeeName: 'A', payDate: 'x', grossPay: 1, netPay: 1, payPeriod: { from: 'a', to: 'b' } })), null);
});
