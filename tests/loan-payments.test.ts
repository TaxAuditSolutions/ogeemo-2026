import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyLoanPayment,
  isPaidOff,
  paymentTotals,
  removeLoanPayment,
  suggestMonthlyInterest,
  validateLoanPayment,
  type LoanPayment,
} from '../src/lib/loan-payments';

const pay = (id: string, date: string, principal: number, interest: number): LoanPayment => ({ id, date, principal, interest });

test('suggested interest is one month of the annual rate on the balance, to the cent', () => {
  assert.equal(suggestMonthlyInterest(10000, 6), 50);
  assert.equal(suggestMonthlyInterest(8500.5, 5.5), 38.96);
  assert.equal(suggestMonthlyInterest(0, 6), 0);
  assert.equal(suggestMonthlyInterest(1000, 0), 0);
  assert.equal(suggestMonthlyInterest(NaN, 6), 0);
  assert.equal(suggestMonthlyInterest(-5, 6), 0);
});

test('a payment is split into principal and interest, to the cent', () => {
  assert.deepEqual(validateLoanPayment({ balance: 10000, date: '2026-11-01', total: '1,000.005', interest: '50' }), { error: null, principal: 950.01, interest: 50, total: 1000.01 });
  assert.deepEqual(validateLoanPayment({ balance: 10000, date: '2026-11-01', total: 200, interest: '' }), { error: null, principal: 200, interest: 0, total: 200 }, 'a blank interest is none');
});

test('a payment needs a real date, an amount above zero and interest between zero and the amount', () => {
  const err = (over: object) => (validateLoanPayment({ balance: 10000, date: '2026-11-01', total: 500, interest: 20, ...over }) as any).error as string;
  assert.match(err({ date: '' }), /date the payment was made/);
  assert.match(err({ date: '2026-02-30' }), /date the payment was made/);
  assert.match(err({ total: 0 }), /more than zero/);
  assert.match(err({ total: '' }), /more than zero/);
  assert.match(err({ total: 'abc' }), /more than zero/);
  assert.match(err({ interest: -1 }), /cannot be negative/);
  assert.match(err({ interest: 600 }), /interest cannot be more than the amount paid/);
});

test('principal can never exceed what is owing, and the message says how much can be paid', () => {
  const result = validateLoanPayment({ balance: 300, date: '2026-11-01', total: 500, interest: 20 }) as any;
  assert.match(result.error, /pays 480\.00 of principal but only 300\.00 is owing\. Pay at most 320\.00 including this interest/);
  assert.equal((validateLoanPayment({ balance: 300, date: '2026-11-01', total: 320, interest: 20 }) as any).error, null, 'exactly clearing the loan is fine');
});

test('a loan that is already paid off accepts no more payments', () => {
  assert.match((validateLoanPayment({ balance: 0, date: '2026-11-01', total: 5, interest: 0 }) as any).error, /already paid off/);
  assert.equal(isPaidOff(0), true);
  assert.equal(isPaidOff(0.004), true);
  assert.equal(isPaidOff(0.01), false);
  assert.equal(isPaidOff(NaN), true);
});

test('recording a payment lowers the balance by the principal only, not the interest', () => {
  const after = applyLoanPayment({ outstandingBalance: 10000, payments: [] }, pay('p1', '2026-11-01', 950, 50));
  assert.equal(after.outstandingBalance, 9050);
  assert.deepEqual(after.payments.map((p) => p.id), ['p1']);
});

test('payments keep date order and the balance never goes below zero', () => {
  let loan = { outstandingBalance: 1000, payments: [] as LoanPayment[] };
  loan = applyLoanPayment(loan, pay('late', '2026-12-01', 300, 10));
  loan = applyLoanPayment(loan, pay('early', '2026-11-01', 400, 10));
  assert.deepEqual(loan.payments.map((p) => p.id), ['early', 'late']);
  assert.equal(loan.outstandingBalance, 300);
  assert.equal(applyLoanPayment({ outstandingBalance: 100 }, pay('x', '2026-11-01', 150, 0)).outstandingBalance, 0);
});

test('balances stay exact to the cent over many payments', () => {
  let loan = { outstandingBalance: 1000, payments: [] as LoanPayment[] };
  for (let i = 0; i < 10; i++) loan = applyLoanPayment(loan, pay(`p${i}`, `2026-0${(i % 9) + 1}-01`, 0.1, 0));
  assert.equal(loan.outstandingBalance, 999);
});

test('removing a payment puts its principal back, capped at the original amount, and reports what it removed', () => {
  const loan = { outstandingBalance: 9050, originalAmount: 10000, payments: [pay('p1', '2026-11-01', 950, 50)] };
  const result = removeLoanPayment(loan, 'p1');
  assert.equal(result.outstandingBalance, 10000);
  assert.deepEqual(result.payments, []);
  assert.equal(result.removed?.id, 'p1');
  const capped = removeLoanPayment({ ...loan, outstandingBalance: 9500 }, 'p1');
  assert.equal(capped.outstandingBalance, 10000, 'a manual correction cannot push it past the original amount');
});

test('removing a payment that is not there changes nothing', () => {
  const loan = { outstandingBalance: 100, originalAmount: 200, payments: [pay('p1', '2026-11-01', 10, 0)] };
  const result = removeLoanPayment(loan, 'nope');
  assert.deepEqual([result.outstandingBalance, result.payments.length, result.removed], [100, 1, null]);
});

test('apply then remove returns to where it started', () => {
  const start = { outstandingBalance: 8500.5, originalAmount: 10000, payments: [] as LoanPayment[] };
  const paid = applyLoanPayment(start, pay('p', '2026-11-01', 333.33, 12.34));
  const undone = removeLoanPayment({ ...paid, originalAmount: 10000 }, 'p');
  assert.equal(undone.outstandingBalance, 8500.5);
});

test('totals of paid principal and interest', () => {
  assert.deepEqual(paymentTotals([pay('a', '2026-01-01', 100.1, 5.05), pay('b', '2026-02-01', 200.2, 4.95)]), { principal: 300.3, interest: 10, total: 310.3 });
  assert.deepEqual(paymentTotals(undefined), { principal: 0, interest: 0, total: 0 });
});
