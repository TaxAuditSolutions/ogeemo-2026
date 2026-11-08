import assert from 'node:assert/strict';
import test from 'node:test';

import {
  checkContactName,
  cleanContactInput,
  duplicateMessage,
  findPossibleDuplicates,
  validateSin,
} from '../src/lib/contact-clean';

test('text fields are trimmed, the name loses repeated spaces and the email is lower case', () => {
  const cleaned = cleanContactInput({ name: '  Bob   Smith ', email: ' Bob@Example.COM ', city: ' Barrie ', payRate: 25, hasContract: true, notes: '   ' });
  assert.deepEqual(cleaned, { name: 'Bob Smith', email: 'bob@example.com', city: 'Barrie', payRate: 25, hasContract: true, notes: '' });
});

test('non-text values and missing fields are left alone', () => {
  const cleaned = cleanContactInput({ payRate: 0, workerType: null, keywords: ['a'] });
  assert.deepEqual(cleaned, { payRate: 0, workerType: null, keywords: ['a'] });
});

test('a name needs two real characters', () => {
  assert.equal(checkContactName('Al'), null);
  assert.match(checkContactName('  A ')!, /full name/);
  assert.match(checkContactName('')!, /full name/);
  assert.match(checkContactName(undefined)!, /full name/);
});

test('a blank SIN is allowed, a valid one is stored as plain digits', () => {
  assert.deepEqual(validateSin(''), { ok: true, sin: '' });
  assert.deepEqual(validateSin(undefined), { ok: true, sin: '' });
  // 046 454 286 is the standard example SIN and passes the check-digit test
  assert.deepEqual(validateSin('046 454 286'), { ok: true, sin: '046454286' });
  assert.deepEqual(validateSin('046-454-286'), { ok: true, sin: '046454286' });
});

test('a SIN with the wrong length, letters, a repeated digit or a bad check digit is refused', () => {
  assert.equal(validateSin('12345').ok, false);
  assert.equal(validateSin('04645428').ok, false);
  assert.equal(validateSin('0464542861').ok, false);
  assert.equal(validateSin('04645428x').ok, false);
  assert.equal(validateSin('111111111').ok, false);
  const bad = validateSin('046454287');
  assert.equal(bad.ok, false);
  assert.match((bad as { error: string }).error, /check-digit/);
});

const existing = [
  { id: '1', name: 'Bob Smith', email: 'bob@example.com' },
  { id: '2', name: 'Carol Jones', email: 'carol@example.com' },
  { id: '3', name: 'Dan Lee' },
];

test('the same email is a possible duplicate, ignoring case and spaces', () => {
  const found = findPossibleDuplicates(existing, { name: 'Robert Smith', email: ' BOB@example.com ' });
  assert.deepEqual(found, [{ id: '1', name: 'Bob Smith', reason: 'email' }]);
});

test('the same name is a possible duplicate, ignoring case and repeated spaces', () => {
  const found = findPossibleDuplicates(existing, { name: 'dan   LEE', email: '' });
  assert.deepEqual(found, [{ id: '3', name: 'Dan Lee', reason: 'name' }]);
});

test('the contact being edited is not a duplicate of itself, and different people are not flagged', () => {
  assert.deepEqual(findPossibleDuplicates(existing, { name: 'Bob Smith', email: 'bob@example.com' }, '1'), []);
  assert.deepEqual(findPossibleDuplicates(existing, { name: 'Eve Adams', email: 'eve@example.com' }), []);
  assert.deepEqual(findPossibleDuplicates(existing, { name: '', email: '' }), []);
});

test('a blank email never matches another blank email', () => {
  const found = findPossibleDuplicates([{ id: '9', name: 'No Email', email: '' }], { name: 'Someone Else', email: '' });
  assert.deepEqual(found, []);
});

test('the prompt names who matched and why', () => {
  assert.equal(duplicateMessage([{ id: '1', name: 'Bob Smith', reason: 'email' }]), '"Bob Smith" already has the same email address.');
  assert.equal(duplicateMessage([{ id: '3', name: 'Dan Lee', reason: 'name' }]), '"Dan Lee" already has the same name.');
  assert.equal(
    duplicateMessage([{ id: '1', name: 'A One', reason: 'email' }, { id: '2', name: 'B Two', reason: 'email' }]),
    '"A One" and 1 more already match (same email address).'
  );
  assert.equal(duplicateMessage([]), '');
});
