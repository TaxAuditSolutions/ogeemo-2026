import assert from 'node:assert/strict';
import test from 'node:test';

import { matchBankTransactions, type RegistryEntry } from '../src/lib/bank-reconcile';

const entry = (over: Partial<RegistryEntry> & { id: string }): RegistryEntry => ({ date: '2026-10-01', amount: 100, direction: 'out', ...over });
const row = (id: string, amount: number, date = '2026-10-01') => ({ id, amount, date });
const status = (results: ReturnType<typeof matchBankTransactions>, id: string) => results.find((r) => r.bankId === id)!;

test('an exact date and amount is a perfect match', () => {
  const r = matchBankTransactions([row('b1', -100)], [entry({ id: 'e1' })]);
  assert.deepEqual(status(r, 'b1'), { bankId: 'b1', status: 'perfect', registryId: 'e1', driftDays: 0 });
});

test('money out never matches an income entry or an invoice, and money in never matches an expense or a bill', () => {
  const withdrawal = matchBankTransactions([row('b1', -100)], [entry({ id: 'inv', direction: 'in' })]);
  assert.equal(status(withdrawal, 'b1').status, 'unmatched', 'a $100 withdrawal must not settle a $100 invoice');
  const deposit = matchBankTransactions([row('b2', 100)], [entry({ id: 'bill', direction: 'out' })]);
  assert.equal(status(deposit, 'b2').status, 'unmatched', 'a $100 deposit must not settle a $100 bill');
  assert.equal(status(matchBankTransactions([row('b3', 100)], [entry({ id: 'e', direction: 'in' })]), 'b3').status, 'perfect');
});

test('the amount must agree to the cent', () => {
  assert.equal(status(matchBankTransactions([row('b1', -100.01)], [entry({ id: 'e1' })]), 'b1').status, 'unmatched');
  assert.equal(status(matchBankTransactions([row('b1', -100)], [entry({ id: 'e1', amount: 100.004 })]), 'b1').status, 'perfect', 'under half a cent apart is the same cent');
});

test('a near date is a drift match, with the direction of the drift', () => {
  const later = status(matchBankTransactions([row('b1', -100, '2026-10-01')], [entry({ id: 'e1', date: '2026-10-04' })]), 'b1');
  assert.deepEqual([later.status, later.driftDays], ['drift', 3]);
  const earlier = status(matchBankTransactions([row('b1', -100, '2026-10-05')], [entry({ id: 'e1', date: '2026-10-02' })]), 'b1');
  assert.deepEqual([earlier.status, earlier.driftDays], ['drift', -3]);
});

test('seven days apart still drifts; eight does not; month ends and years are counted as real days', () => {
  assert.equal(status(matchBankTransactions([row('b', -100, '2026-10-01')], [entry({ id: 'e', date: '2026-10-08' })]), 'b').status, 'drift');
  assert.equal(status(matchBankTransactions([row('b', -100, '2026-10-01')], [entry({ id: 'e', date: '2026-10-09' })]), 'b').status, 'unmatched');
  const across = status(matchBankTransactions([row('b', -100, '2026-12-30')], [entry({ id: 'e', date: '2027-01-02' })]), 'b');
  assert.deepEqual([across.status, across.driftDays], ['drift', 3]);
});

test('one book entry is matched to one bank row only', () => {
  const r = matchBankTransactions([row('b1', -100), row('b2', -100)], [entry({ id: 'e1' })]);
  assert.deepEqual([status(r, 'b1').status, status(r, 'b2').status], ['perfect', 'unmatched']);
});

test('an exact match later in the file is not stolen by an earlier near-date row', () => {
  const r = matchBankTransactions(
    [row('early', -100, '2026-10-03'), row('exact', -100, '2026-10-05')],
    [entry({ id: 'e1', date: '2026-10-05' })]
  );
  assert.equal(status(r, 'exact').registryId, 'e1');
  assert.equal(status(r, 'exact').status, 'perfect');
  assert.equal(status(r, 'early').status, 'unmatched');
});

test('the closest of several near-date entries is chosen', () => {
  const r = matchBankTransactions([row('b', -100, '2026-10-10')], [entry({ id: 'far', date: '2026-10-04' }), entry({ id: 'near', date: '2026-10-11' })]);
  assert.equal(status(r, 'b').registryId, 'near');
});

test('entries already reconciled are never matched again', () => {
  // Reconciled against a different, stable-id row: it stays out of play, and this row is simply new.
  const r = matchBankTransactions([row('bank_00000001', -100)], [entry({ id: 'e1', isReconciled: true, bankReferenceId: 'bank_ffffffff' })]);
  assert.equal(status(r, 'bank_00000001').status, 'unmatched');
});

test('a row reconciled in an earlier session is a duplicate, found by its stable id', () => {
  const r = matchBankTransactions([row('bank_0123abcd', -100)], [entry({ id: 'e1', isReconciled: true, bankReferenceId: 'bank_0123abcd' })]);
  assert.equal(status(r, 'bank_0123abcd').status, 'duplicate');
});

test('entries reconciled before ids were stable are recognised by direction, amount and date', () => {
  const old = entry({ id: 'e1', isReconciled: true, bankReferenceId: 'bank_1700000000000_3' });
  assert.equal(status(matchBankTransactions([row('bank_aaaaaaaa', -100)], [old]), 'bank_aaaaaaaa').status, 'duplicate');
  assert.equal(status(matchBankTransactions([row('bank_aaaaaaaa', -100, '2026-10-02')], [old]), 'bank_aaaaaaaa').status, 'unmatched', 'different day is a new row');
  assert.equal(status(matchBankTransactions([row('bank_aaaaaaaa', 100)], [old]), 'bank_aaaaaaaa').status, 'unmatched', 'other direction is a new row');
});

test('a legacy reconciled entry covers one row only, so a second identical row is still new', () => {
  const old = entry({ id: 'e1', isReconciled: true, bankReferenceId: 'bank_1700000000000_3' });
  const r = matchBankTransactions([row('bank_a1', -100), row('bank_a2', -100)], [old]);
  assert.deepEqual([status(r, 'bank_a1').status, status(r, 'bank_a2').status], ['duplicate', 'unmatched']);
});

test('zero-amount rows and unreadable dates never match anything', () => {
  assert.equal(status(matchBankTransactions([row('z', 0)], [entry({ id: 'e', amount: 0 })]), 'z').status, 'unmatched');
  const r = matchBankTransactions([row('b', -100, 'garbage')], [entry({ id: 'e', date: '2026-10-01' })]);
  assert.equal(status(r, 'b').status, 'unmatched');
});

test('results line up with the bank rows, in order', () => {
  const rows = [row('a', -1), row('b', -2), row('c', -3)];
  assert.deepEqual(matchBankTransactions(rows, []).map((r) => r.bankId), ['a', 'b', 'c']);
});
