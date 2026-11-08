import assert from 'node:assert/strict';
import test from 'node:test';

import { buildFullBalanceSheet, type BalanceSheetRecords } from '../src/lib/balance-sheet-inputs';

const empty: BalanceSheetRecords = { accounts: [], income: [], expenses: [], inventory: [], invoices: [], bills: [], assets: [], loans: [], remittances: [], equity: [] };
const records = (over: Partial<BalanceSheetRecords>): BalanceSheetRecords => ({ ...empty, ...over });
const round = (n: number) => Math.round(n * 100) / 100;

test('an empty business has an empty, balanced sheet', () => {
  const sheet = buildFullBalanceSheet(empty);
  assert.deepEqual([sheet.totalAssets, sheet.totalLiabilities, sheet.netWorth], [0, 0, 0]);
});

test('every kind of asset and liability reaches the sheet, and it balances', () => {
  const sheet = buildFullBalanceSheet(records({
    accounts: [{ id: 'a', name: 'Chequing', type: 'Bank', openingBalance: 1000, openingBalanceDate: '2026-01-01' }],
    income: [{ date: '2026-02-01', totalAmount: 500, depositedTo: 'Chequing' }, { date: '2026-02-02', totalAmount: 100, depositedTo: 'Petty Cash Box' }],
    expenses: [{ date: '2026-02-03', totalAmount: 200, paidFrom: 'Chequing' }],
    inventory: [{ type: 'Product for Sale', stockQuantity: 10, cost: 12.5 }],
    invoices: [{ originalAmount: 800, amountPaid: 300 }, { originalAmount: 50, amountPaid: 0, status: 'draft' }],
    bills: [{ totalAmount: 150 }],
    assets: [{ undepreciatedCapitalCost: 2000, depreciationEntries: [{ date: '2026-12-31', amount: 400 }] }],
    loans: [{ loanType: 'payable', outstandingBalance: 900 }, { loanType: 'receivable', outstandingBalance: 100 }],
    remittances: [{ status: 'Due', amount: 75 }, { status: 'Paid', amount: 999 }],
  }));
  assert.equal(sheet.cash, 1300);
  assert.equal(sheet.pettyCash, 100);
  assert.equal(sheet.inventory, 125);
  assert.equal(sheet.accountsReceivable, 500, 'the draft invoice is not receivable');
  assert.equal(sheet.capitalAssets, 1600);
  assert.equal(sheet.totalAssets, 1300 + 100 + 125 + 500 + 1600 + 100);
  assert.equal(sheet.totalLiabilities, 150 + 900 + 75);
  assert.equal(round(sheet.totalLiabilities + sheet.netWorth), sheet.totalAssets);
});

test('cash that names no registry account is reported in the notes, not added to the sheet', () => {
  const sheet = buildFullBalanceSheet(records({
    accounts: [{ id: 'a', name: 'Chequing', type: 'Bank', openingBalance: 100, openingBalanceDate: '2026-01-01' }],
    income: [{ date: '2026-03-01', totalAmount: 400, depositedTo: 'Bank Account' }],
    expenses: [{ date: '2026-03-02', totalAmount: 150, paidFrom: 'Cash / Default' }],
  }));
  assert.equal(sheet.cash, 100);
  assert.equal(sheet.notes.unassignedCashNet, 250);
  assert.equal(sheet.notes.unassignedCashCount, 2);
});

test('notes say when an account has no opening balance and when stock has no cost', () => {
  const sheet = buildFullBalanceSheet(records({
    accounts: [{ id: 'a', name: 'Chequing', type: 'Bank' }, { id: 'b', name: 'Visa', type: 'Credit Card' }, { id: 'c', name: 'Savings', type: 'Bank', openingBalance: 0 }],
    inventory: [{ type: 'Product for Sale', stockQuantity: 5, cost: null }, { type: 'Product for Sale', stockQuantity: 2, cost: 3 }],
  }));
  assert.equal(sheet.notes.accountsWithoutOpeningBalance, 1, 'a card is not counted, and a zero opening balance is a real value');
  assert.equal(sheet.notes.uncostedInventoryItems, 1);
  assert.equal(sheet.inventory, 6);
});

test('credit card spending is a liability, and personal accounts are not part of the business', () => {
  const sheet = buildFullBalanceSheet(records({
    accounts: [{ id: 'v', name: 'Visa', type: 'Credit Card', openingBalance: 0 }, { id: 'p', name: 'Mine', type: 'Bank', businessType: 'Personal', openingBalance: 5000 }],
    expenses: [{ date: '2026-03-01', totalAmount: 220, paidFrom: 'Visa' }],
  }));
  assert.equal(sheet.creditCards, 220);
  assert.equal(sheet.cash, 0);
  assert.equal(sheet.totalLiabilities, 220);
});
