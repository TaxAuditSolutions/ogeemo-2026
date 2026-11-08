import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SYSTEM_FOLDERS,
  checkFolderName,
  descendantFolderIds,
  planFolderDelete,
  wouldCreateCycle,
} from '../src/lib/contact-folder-rules';
import { contactMatchesQuery, filterContacts } from '../src/lib/contact-search';

const folders = [
  { id: 'clients', name: 'Clients', parentId: null, isSystem: true },
  { id: 'misc', name: 'Miscellaneous', parentId: null, isSystem: true },
  { id: 'workers', name: 'Workers', parentId: null, isSystem: true },
  { id: 'a', name: 'Acme', parentId: 'clients' },
  { id: 'b', name: 'Acme East', parentId: 'a' },
  { id: 'c', name: 'Acme East Dock', parentId: 'b' },
  { id: 'top', name: 'Projects', parentId: null },
];

test('descendants include the folder itself and everything below, at any depth', () => {
  assert.deepEqual(descendantFolderIds(folders, 'a').sort(), ['a', 'b', 'c']);
  assert.deepEqual(descendantFolderIds(folders, 'c'), ['c']);
  assert.deepEqual(descendantFolderIds(folders, 'nope'), ['nope']);
});

test('a loop in bad data is visited once instead of forever', () => {
  const loop = [{ id: 'x', name: 'X', parentId: 'y' }, { id: 'y', name: 'Y', parentId: 'x' }];
  assert.deepEqual(descendantFolderIds(loop, 'x').sort(), ['x', 'y']);
});

test('a folder cannot be moved into itself or into its own descendant', () => {
  assert.equal(wouldCreateCycle(folders, 'a', 'a'), true);
  assert.equal(wouldCreateCycle(folders, 'a', 'c'), true);
  assert.equal(wouldCreateCycle(folders, 'a', 'top'), false);
  assert.equal(wouldCreateCycle(folders, 'c', 'a'), false); // moving a child up is fine
  assert.equal(wouldCreateCycle(folders, 'a', null), false);
});

test('a folder name is required, short, and has no slashes', () => {
  assert.match(checkFolderName('   ', null, folders)!, /Enter a folder name/);
  assert.match(checkFolderName('x'.repeat(61), null, folders)!, /at most 60/);
  assert.match(checkFolderName('Q1/Q2', null, folders)!, /cannot contain/);
  assert.equal(checkFolderName('  Invoices   2026 ', null, folders), null);
});

test('a name that matches a system folder is refused anywhere, ignoring case and spaces', () => {
  assert.match(checkFolderName('clients', null, folders)!, /system folder name/);
  assert.match(checkFolderName(' FRIENDS ', 'a', folders)!, /system folder name/);
  assert.match(checkFolderName('Admin', 'b', folders)!, /"Admin" is a system folder name/);
  assert.equal(SYSTEM_FOLDERS.some((f) => f.name === 'Miscellaneous'), true);
});

test('a duplicate name is refused among siblings only, and a folder keeps its own name when renamed', () => {
  assert.match(checkFolderName('acme', 'clients', folders)!, /already a folder named "Acme"/);
  assert.equal(checkFolderName('Acme', 'top', folders), null); // different parent
  assert.equal(checkFolderName('Acme', 'clients', folders, 'a'), null); // renaming itself
  assert.equal(checkFolderName('Clients', null, folders, 'clients'), null); // the system folder itself
});

test('deleting a folder moves its contacts to the parent and its subfolders up one level', () => {
  const plan = planFolderDelete(folders, 'a');
  assert.deepEqual(plan, { error: null, contactsTo: 'clients', childrenTo: 'clients', childIds: ['b'] });
});

test('deleting a top-level folder sends its contacts to Miscellaneous and its subfolders to the top', () => {
  const withChild = [...folders, { id: 'p1', name: 'Phase 1', parentId: 'top' }];
  assert.deepEqual(planFolderDelete(withChild, 'top'), { error: null, contactsTo: 'misc', childrenTo: null, childIds: ['p1'] });
});

test('a system folder or a missing folder cannot be deleted, and there must be somewhere to move contacts', () => {
  assert.match((planFolderDelete(folders, 'clients') as { error: string }).error, /system folder/);
  assert.match((planFolderDelete(folders, 'gone') as { error: string }).error, /no longer exists/);
  assert.match((planFolderDelete([{ id: 't', name: 'T', parentId: null }], 't') as { error: string }).error, /no folder to move/);
});

const people = [
  { name: 'Bob Smith', email: 'bob@acme.com', businessName: 'Acme Ltd', city: 'Barrie', cellPhone: '(705) 555-0123', notes: 'Prefers email' },
  { name: 'Carol Jones', email: 'carol@zed.ca', businessPhone: '416-555-0199', city: 'Toronto' },
  { name: 'Dan Lee', homePhone: '+1 705 555 0188' },
];

test('every word must match somewhere, in any order and any case', () => {
  assert.equal(contactMatchesQuery(people[0], 'bob barrie'), true);
  assert.equal(contactMatchesQuery(people[0], 'BARRIE acme'), true);
  assert.equal(contactMatchesQuery(people[0], 'bob toronto'), false);
  assert.equal(contactMatchesQuery(people[0], ''), true);
});

test('company, email and notes are searched', () => {
  assert.deepEqual(filterContacts(people, 'acme').map((p) => p.name), ['Bob Smith']);
  assert.deepEqual(filterContacts(people, 'zed.ca').map((p) => p.name), ['Carol Jones']);
  assert.deepEqual(filterContacts(people, 'prefers').map((p) => p.name), ['Bob Smith']);
});

test('a phone number matches however it was punctuated, but short digit runs do not', () => {
  assert.deepEqual(filterContacts(people, '705-555-0123').map((p) => p.name), ['Bob Smith']);
  assert.deepEqual(filterContacts(people, '7055550188').map((p) => p.name), ['Dan Lee']);
  assert.deepEqual(filterContacts(people, '555').map((p) => p.name).sort(), ['Bob Smith', 'Carol Jones', 'Dan Lee']);
  assert.deepEqual(filterContacts(people, '55'), []);
});

test('a blank query returns everyone and the SIN is never searched', () => {
  assert.equal(filterContacts(people, '   ').length, 3);
  assert.equal(contactMatchesQuery({ name: 'Eve', ...({ sin: '046454286' } as object) }, '046454286'), false);
});
