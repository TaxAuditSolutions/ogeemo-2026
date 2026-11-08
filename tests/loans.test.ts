import assert from 'node:assert/strict';
import test from 'node:test';

import { buildBalanceSheet, validateEquity, validateLoan } from '../src/lib/loans';

const base = { loanType: 'payable' as const, counterparty: ' Bank of Acme ', originalAmount: '10,000', outstandingBalance: '8,500.505', startDate: '2026-01-15' };

test('a good loan is cleaned: trimmed name, commas removed, money to the cent, blanks become zero', () => {
  const result = validateLoan({ ...base, interestRate: '5.5', termMonths: '60', monthlyPayment: '190.456' });
  assert.deepEqual(result, {
    error: null,
    loan: { loanType: 'payable', counterparty: 'Bank of Acme', originalAmount: 10000, outstandingBalance: 8500.51, interestRate: 5.5, termMonths: 60, monthlyPayment: 190.46, startDate: '2026-01-15' },
  });
  const minimal = validateLoan(base) as any;
  assert.equal(minimal.loan.interestRate, 0);
  assert.equal(minimal.loan.termMonths, 0);
  assert.equal(minimal.loan.monthlyPayment, 0);
});

test('a loan needs a counterparty, a positive original amount and a balance between zero and the original', () => {
  const err = (over: object) => (validateLoan({ ...base, ...over }) as any).error as string;
  assert.match(err({ counterparty: '  ' }), /who the loan is with/);
  assert.match(err({ originalAmount: '0' }), /original loan amount/);
  assert.match(err({ originalAmount: '' }), /original loan amount/);
  assert.match(err({ originalAmount: 'abc' }), /original loan amount/);
  assert.match(err({ outstandingBalance: '' }), /outstanding balance/);
  assert.match(err({ outstandingBalance: '-1' }), /outstanding balance/);
  assert.match(err({ outstandingBalance: '10,000.01' }), /cannot be more than the original/);
  assert.equal(err({ outstandingBalance: '0' }), null, 'a fully repaid loan is allowed');
  assert.equal(err({ outstandingBalance: '10000' }), null);
});

test('dates, rate, term and payment are checked', () => {
  const err = (over: object) => (validateLoan({ ...base, ...over }) as any).error as string;
  assert.match(err({ startDate: '' }), /valid start date/);
  assert.match(err({ startDate: '2026-02-30' }), /valid start date/);
  assert.match(err({ interestRate: '101' }), /between 0 and 100/);
  assert.match(err({ interestRate: '-1' }), /between 0 and 100/);
  assert.match(err({ termMonths: '12.5' }), /whole number of months/);
  assert.match(err({ termMonths: '-3' }), /whole number of months/);
  assert.match(err({ monthlyPayment: '-5' }), /cannot be negative/);
});

const sheet = (over: Partial<Parameters<typeof buildBalanceSheet>[0]> = {}) =>
  buildBalanceSheet({ accountsReceivable: 1000, capitalAssets: 5000, loans: [], accountsPayable: 400, payrollLiabilities: 100, equity: [], ...over });

test('the balance sheet adds assets, liabilities and net worth to the cent', () => {
  const result = sheet({
    loans: [
      { loanType: 'receivable', outstandingBalance: 250.1 },
      { loanType: 'payable', outstandingBalance: 2000.2 },
      { loanType: 'payable', outstandingBalance: 0.1 },
    ],
  });
  assert.equal(result.loansReceivable, 250.1);
  assert.equal(result.loansPayable, 2000.3);
  assert.equal(result.totalAssets, 6250.1);
  assert.equal(result.totalLiabilities, 2500.3);
  assert.equal(result.netWorth, 3749.8);
});

test('owner\'s equity shown is assets less liabilities, so the sheet always balances', () => {
  for (const equity of [[], [{ type: 'contribution' as const, amount: 9999 }], [{ type: 'draw' as const, amount: 123 }]]) {
    const result = sheet({ equity });
    assert.equal(roundTrip(result.totalLiabilities + result.netWorth), result.totalAssets, 'liabilities + equity = assets');
  }
});

const roundTrip = (n: number) => Math.round(n * 100) / 100;

test('contributions and draws are reported separately and never replace net worth', () => {
  const result = sheet({ equity: [{ type: 'contribution', amount: 1000 }, { type: 'contribution', amount: 500.5 }, { type: 'draw', amount: 200 }] });
  assert.deepEqual([result.contributions, result.draws, result.ownerContributedEquity], [1500.5, 200, 1300.5]);
  assert.equal(result.netWorth, 5500, 'net worth comes from assets and liabilities, not from the equity entries');
});

test('net worth can be negative when liabilities exceed assets', () => {
  const result = sheet({ accountsReceivable: 0, capitalAssets: 100, accountsPayable: 500 });
  assert.equal(result.netWorth, -500, '100 of assets less 500 payable and the 100 payroll owing');
});

test('equity entries need a real date and an amount above zero, rounded to the cent', () => {
  assert.deepEqual(validateEquity({ date: '2026-11-08', description: 'x', amount: '1,234.567' }), { error: null, amount: 1234.57 });
  assert.match((validateEquity({ date: '', description: '', amount: '5' }) as any).error, /valid date/);
  assert.match((validateEquity({ date: '2026-02-30', description: '', amount: '5' }) as any).error, /valid date/);
  for (const amount of ['0', '-5', 'abc', '']) assert.match((validateEquity({ date: '2026-11-08', description: '', amount }) as any).error, /greater than zero/, amount);
});
