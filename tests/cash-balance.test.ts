import assert from 'node:assert/strict';
import test from 'node:test';

import { summarizeCash, type CashAccount } from '../src/lib/cash-balance';

const chequing: CashAccount = { id: 'acc1', name: 'Chequing', type: 'Bank', openingBalance: 1000, openingBalanceDate: '2026-01-01' };
const income = (date: string, amount: number, depositedTo: string, extra: object = {}) => ({ date, totalAmount: amount, depositedTo, ...extra });
const expense = (date: string, amount: number, paidFrom: string, extra: object = {}) => ({ date, totalAmount: amount, paidFrom, ...extra });
const one = (accounts: CashAccount[], inc: any[], exp: any[], index = 0) => summarizeCash(accounts, inc, exp).accounts[index];

test('cash is the opening balance plus money in less money out', () => {
  const result = one([chequing], [income('2026-03-01', 500, 'Chequing')], [expense('2026-03-02', 120.5, 'Chequing')]);
  assert.deepEqual([result.moneyIn, result.moneyOut, result.balance], [500, 120.5, 1379.5]);
});

test('an account is matched by its name or its id, ignoring case and spaces', () => {
  const result = one([chequing], [income('2026-03-01', 100, '  chequing '), income('2026-03-02', 50, 'acc1')], []);
  assert.equal(result.moneyIn, 150);
});

test('entries before the opening date are already inside the opening balance and are not counted twice', () => {
  const result = one([chequing], [income('2025-12-31', 999, 'Chequing'), income('2026-01-01', 10, 'Chequing')], [expense('2025-06-01', 50, 'Chequing')]);
  assert.deepEqual([result.moneyIn, result.moneyOut, result.balance], [10, 0, 1010]);
  assert.equal(result.entriesCounted, 1);
});

test('with no opening date every entry counts', () => {
  const result = one([{ ...chequing, openingBalanceDate: undefined }], [income('2020-01-01', 5, 'Chequing')], []);
  assert.equal(result.balance, 1005);
});

test('personal entries are left out of cash', () => {
  const result = one([chequing], [income('2026-03-01', 500, 'Chequing', { type: 'personal' })], [expense('2026-03-02', 40, 'Chequing', { type: 'business' })]);
  assert.deepEqual([result.moneyIn, result.moneyOut], [0, 40]);
});

test('entries that name no registry account are reported as unassigned, not guessed at or dropped', () => {
  const summary = summarizeCash(
    [chequing],
    [income('2026-03-01', 200, 'Bank Account'), income('2026-03-02', 30, 'Cash / Default'), income('2026-03-03', 1, 'Some Old Account')],
    [expense('2026-03-04', 80, 'Bank Account')]
  );
  assert.deepEqual(summary.unassigned, { moneyIn: 231, moneyOut: 80, net: 151, count: 4 });
  assert.equal(summary.accounts[0].balance, 1000, 'registry account untouched by them');
  assert.equal(summary.totalCash, 1000);
});

test('the petty cash box is its own float, kept apart from bank cash and from unassigned', () => {
  const summary = summarizeCash([chequing], [income('2026-03-01', 100, 'Petty Cash Box')], [expense('2026-03-02', 35.25, 'Petty Cash Box')]);
  assert.equal(summary.pettyCash, 64.75);
  assert.equal(summary.unassigned.count, 0);
  assert.equal(summary.totalCash, 1000);
});

test('total cash adds bank and cash accounts but not credit cards or personal accounts', () => {
  const accounts: CashAccount[] = [
    chequing,
    { id: 'acc2', name: 'Savings', type: 'Bank', openingBalance: 500 },
    { id: 'acc3', name: 'Visa', type: 'Credit Card', openingBalance: 0 },
    { id: 'acc4', name: 'My Own Account', type: 'Bank', businessType: 'Personal', openingBalance: 9999 },
  ];
  const summary = summarizeCash(accounts, [], [expense('2026-03-01', 300, 'Visa')]);
  assert.equal(summary.totalCash, 1500);
  assert.equal(summary.creditCardOwing, 300, 'spending on a card is money owed, not cash lost');
});

test('a card that is paid down or in credit owes nothing, never a negative amount', () => {
  const visa: CashAccount = { id: 'v', name: 'Visa', type: 'Credit Card', openingBalance: 0 };
  assert.equal(summarizeCash([visa], [income('2026-03-01', 50, 'Visa')], []).creditCardOwing, 0);
});

test('an opening balance can be negative (overdrawn) and amounts are exact to the cent', () => {
  const overdrawn: CashAccount = { id: 'o', name: 'Operating', type: 'Bank', openingBalance: -250.1 };
  const entries = Array.from({ length: 10 }, (_, i) => income(`2026-03-0${(i % 9) + 1}`, 0.1, 'Operating'));
  assert.equal(one([overdrawn], entries, []).balance, -249.1);
});

test('empty and junk values give zeros, not NaN', () => {
  const summary = summarizeCash([{ id: 'a', name: 'A' }], [{ date: 'garbage', totalAmount: NaN, depositedTo: 'A' }], []);
  assert.equal(summary.accounts[0].balance, 0);
  assert.equal(summary.totalCash, 0);
  assert.deepEqual(summarizeCash([], [], []).unassigned, { moneyIn: 0, moneyOut: 0, net: 0, count: 0 });
});
