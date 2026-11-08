import assert from 'node:assert/strict';
import test from 'node:test';

import {
  accountAfterReconcile,
  accountsForStatement,
  chooseStatementAccount,
  isGenericAccountName,
} from '../src/lib/reconcile-account';

const accounts = [
  { id: 'a1', name: 'Chequing', type: 'Bank' as const, businessType: 'Business' as const },
  { id: 'a2', name: 'Visa', type: 'Credit Card' as const },
  { id: 'a3', name: 'Home Savings', type: 'Bank' as const, businessType: 'Personal' as const },
  { id: 'a4', name: '  ', type: 'Bank' as const },
];

test('generic names are recognised ignoring case and spaces, a real account and the petty cash box are not', () => {
  for (const name of ['Bank Account', ' cash / default ', 'CASH ACCOUNT', 'Default', '', undefined, null]) {
    assert.equal(isGenericAccountName(name as any), true, String(name));
  }
  for (const name of ['Chequing', 'Petty Cash Box', 'Bank Account 2']) {
    assert.equal(isGenericAccountName(name), false, name);
  }
});

test('only business accounts with a name can be chosen for a statement', () => {
  assert.deepEqual(accountsForStatement(accounts).map((a) => a.name), ['Chequing', 'Visa']);
});

test('a generic entry is assigned to the statement account, a real account is kept', () => {
  assert.equal(accountAfterReconcile('Bank Account', 'Chequing'), 'Chequing');
  assert.equal(accountAfterReconcile(undefined, 'Chequing'), 'Chequing');
  assert.equal(accountAfterReconcile('Visa', 'Chequing'), 'Visa');
  assert.equal(accountAfterReconcile('Petty Cash Box', 'Chequing'), 'Petty Cash Box');
});

test('choosing an account needs a real, available business account', () => {
  assert.equal(chooseStatementAccount(accounts, 'a1').account?.name, 'Chequing');
  assert.match(chooseStatementAccount(accounts, '').error!, /Choose the account/);
  assert.match(chooseStatementAccount(accounts, 'a3').error!, /no longer available/);
  assert.match(chooseStatementAccount(accounts, 'zzz').error!, /no longer available/);
  assert.match(chooseStatementAccount([], 'a1').error!, /no longer available/);
});
