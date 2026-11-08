process.env.TZ = 'America/Toronto';

import assert from 'node:assert/strict';
import test from 'node:test';

import { buildIncomeStatement, isSalesTaxRemittance, netAmountOf, taxOf } from '../src/lib/income-statement';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);
const config = {
  salesLine: 'Part 3A',
  expenseCategories: [
    { line: '8521', key: 'advertising' },
    { line: '8690', key: 'insurance' },
  ],
};
const year = { from: d(2026, 1, 1), to: d(2026, 12, 31) };

test('tax inside an entry: the recorded tax, else total minus pre-tax, else none', () => {
  assert.equal(taxOf({ totalAmount: 113, taxAmount: 13 }), 13);
  assert.equal(taxOf({ totalAmount: 113, preTaxAmount: 100 }), 13);
  assert.equal(taxOf({ totalAmount: 113 }), 0);
  assert.equal(taxOf({ totalAmount: 113, taxAmount: -4 }), 0, 'never negative');
  assert.equal(netAmountOf({ totalAmount: 113, taxAmount: 13 }), 100);
  assert.equal(netAmountOf({ totalAmount: 113 }), 113);
});

test('income is counted before sales tax', () => {
  const income = [
    { date: '2026-03-01', totalAmount: 113, taxAmount: 13, incomeCategory: 'Part 3A' },
    { date: '2026-03-02', totalAmount: 56.5, taxAmount: 6.5, incomeCategory: 'Part 3D' },
  ];
  const result = buildIncomeStatement(income, [], year, config);
  assert.deepEqual(result.businessIncome, { sales: 100, other: 50, gross: 150 });
  assert.equal(result.netProfitOrLoss, 150);
});

test('expenses are counted before sales tax, by tax line, and unmatched lines go to other expenses', () => {
  const expenses = [
    { date: '2026-04-01', totalAmount: 113, taxAmount: 13, category: '8521' },
    { date: '2026-04-02', totalAmount: 226, preTaxAmount: 200, category: '8690' },
    { date: '2026-04-03', totalAmount: 22.6, taxAmount: 2.6, category: 'nonsense' },
  ];
  const result = buildIncomeStatement([], expenses, year, config);
  assert.equal(result.expenses.advertising, 100);
  assert.equal(result.expenses.insurance, 200);
  assert.equal(result.expenses.otherExpenses, 20);
  assert.equal(result.totalExpenses, 320);
  assert.equal(result.netProfitOrLoss, -320);
});

test('net profit is income minus expenses, both before tax: tax collected and paid never reach profit', () => {
  const income = [{ date: '2026-05-01', totalAmount: 1130, taxAmount: 130, incomeCategory: 'Part 3A' }];
  const expenses = [{ date: '2026-05-02', totalAmount: 339, taxAmount: 39, category: '8521' }];
  const result = buildIncomeStatement(income, expenses, year, config);
  assert.equal(result.netProfitOrLoss, 700, '1000 - 300; the 91.00 net tax owing is not in profit');
});

test('the payment of net sales tax to CRA is not an expense, by flag or by how the page names it', () => {
  const expenses = [
    { date: '2026-04-30', totalAmount: 91, company: 'Canada Revenue Agency', description: 'Sales Tax Remittance for Jan 1 - Mar 31', category: '8690' },
    { date: '2026-05-31', totalAmount: 50, isSalesTaxRemittance: true, category: '8690' },
    { date: '2026-06-01', totalAmount: 40, company: 'Canada Revenue Agency', description: 'Income tax instalment', category: '8690' },
  ];
  const result = buildIncomeStatement([], expenses, year, config);
  assert.equal(result.expenses.insurance, 40, 'a different payment to CRA still counts');
  assert.deepEqual(result.notes, { incomeWithoutTaxRecorded: 0, remittancesExcluded: 2, remittanceTotal: 141, payrollRemittancesExcluded: 0, payrollRemittanceTotal: 0 });
  assert.equal(isSalesTaxRemittance({ company: ' canada revenue agency ', description: 'sales tax remittance' }), true);
  assert.equal(isSalesTaxRemittance({ company: 'Acme', description: 'Sales Tax Remittance' }), false);
});

test('a payroll remittance is not counted again: the payroll run already expensed the gross wages', () => {
  const expenses = [
    { date: '2026-06-30', totalAmount: 5000, category: '9060' },
    { date: '2026-07-15', totalAmount: 1000, category: '9060', isPayrollRemittance: true },
  ];
  const result = buildIncomeStatement([], expenses, year, config);
  assert.equal(result.totalExpenses, 5000, 'wages counted once, not 6000');
  assert.equal(result.notes.payrollRemittancesExcluded, 1);
  assert.equal(result.notes.payrollRemittanceTotal, 1000);
  assert.equal(result.notes.remittancesExcluded, 0, 'kept apart from sales tax payments');
});

test('older entries with no tax data are counted at the full amount and are counted in the notes', () => {
  const income = [
    { date: '2026-02-01', totalAmount: 200, incomeCategory: 'Part 3A' },
    { date: '2026-02-02', totalAmount: 113, taxAmount: 13, incomeCategory: 'Part 3A' },
    { date: '2026-02-03', totalAmount: 80, taxAmount: 0, incomeCategory: 'Part 3A' },
  ];
  const result = buildIncomeStatement(income, [], year, config);
  assert.equal(result.businessIncome.sales, 380);
  assert.equal(result.notes.incomeWithoutTaxRecorded, 1, 'a recorded zero is not "missing"');
});

test('personal entries and entries outside the dates are left out; first and last day are in', () => {
  const income = [
    { date: '2025-12-31', totalAmount: 1000, incomeCategory: 'Part 3A' },
    { date: '2026-01-01', totalAmount: 10, incomeCategory: 'Part 3A' },
    { date: '2026-12-31', totalAmount: 20, incomeCategory: 'Part 3A' },
    { date: '2027-01-01', totalAmount: 1000, incomeCategory: 'Part 3A' },
    { date: '2026-06-01', totalAmount: 500, type: 'personal', incomeCategory: 'Part 3A' },
  ];
  assert.equal(buildIncomeStatement(income, [], year, config).businessIncome.sales, 30);
});

test('a payment posted from an invoice flows through before tax, end to end', () => {
  // Invoice 113.00 with 13.00 tax, paid in two parts: the payments carry 5.75 + 7.25 tax.
  const income = [
    { date: '2026-07-01', totalAmount: 50, preTaxAmount: 44.25, taxAmount: 5.75, incomeCategory: 'Part 3A' },
    { date: '2026-07-15', totalAmount: 63, preTaxAmount: 55.75, taxAmount: 7.25, incomeCategory: 'Part 3A' },
  ];
  const result = buildIncomeStatement(income, [], year, config);
  assert.equal(result.businessIncome.sales, 100);
});

test('figures stay whole cents over many entries and the statement of nothing is zeros', () => {
  const income = Array.from({ length: 200 }, (_, i) => ({ date: '2026-08-01', totalAmount: 19.99 + i / 100, taxAmount: 2.3, incomeCategory: 'Part 3A' }));
  const { businessIncome } = buildIncomeStatement(income, [], year, config);
  assert.equal(Math.round(businessIncome.gross * 100) / 100, businessIncome.gross);
  const empty = buildIncomeStatement([], [], year, config);
  assert.equal(empty.netProfitOrLoss, 0);
  assert.equal(empty.totalExpenses, 0);
});
