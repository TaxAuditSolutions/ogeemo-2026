import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  ContactInUseError,
  deleteBlockedMessage,
  planContactDelete,
  tallyLinks,
  totalLinks,
} from '../src/lib/contact-links';
import { CONTACT_REFERENCES } from '../src/lib/contact-merge';

const hit = (contactId: string, collection: string, docId: string) => ({ contactId, collection, docId });

test('linked records are counted once per record per contact, even when a record names the contact twice', () => {
  const tally = tallyLinks([
    hit('c1', 'tasks', 't1'),
    hit('c1', 'tasks', 't1'), // same task, named as client and as worker
    hit('c1', 'tasks', 't2'),
    hit('c1', 'invoices', 'i1'),
    hit('c2', 'timeLogs', 'l1'),
  ]);
  assert.deepEqual(tally.c1, { tasks: 2, invoices: 1 });
  assert.deepEqual(tally.c2, { timeLogs: 1 });
});

test('contacts with nothing linked are absent, and a blank contact id is ignored', () => {
  assert.deepEqual(tallyLinks([]), {});
  assert.deepEqual(tallyLinks([hit('', 'tasks', 't1')]), {});
});

test('the same document id in two collections is two records', () => {
  const tally = tallyLinks([hit('c1', 'tasks', 'x'), hit('c1', 'projects', 'x')]);
  assert.deepEqual(tally.c1, { tasks: 1, projects: 1 });
  assert.equal(totalLinks(tally.c1), 2);
  assert.equal(totalLinks(undefined), 0);
});

const people = [
  { id: 'c1', name: 'Acme Ltd' },
  { id: 'c2', name: 'Bob Free' },
  { id: 'c3' },
];

test('contacts in use are split from those that can be deleted', () => {
  const links = tallyLinks([hit('c1', 'tasks', 't1'), hit('c1', 'invoices', 'i1'), hit('c3', 'quotes', 'q1')]);
  const plan = planContactDelete(people, links);
  assert.deepEqual(plan.deletable, ['c2']);
  assert.deepEqual(plan.blocked.map((b) => [b.id, b.name, b.summary]), [
    ['c1', 'Acme Ltd', '1 task, 1 invoice'],
    ['c3', 'Unnamed contact', '1 quote'],
  ]);
});

test('with nothing linked every contact can be deleted', () => {
  const plan = planContactDelete(people, {});
  assert.deepEqual(plan.deletable, ['c1', 'c2', 'c3']);
  assert.deepEqual(plan.blocked, []);
});

test('the refusal names what the contact is used by and says how to proceed', () => {
  const plan = planContactDelete([people[0]], tallyLinks([hit('c1', 'tasks', 't1'), hit('c1', 'tasks', 't2'), hit('c1', 'workOrders', 'w1')]));
  const message = deleteBlockedMessage(plan.blocked);
  assert.match(message, /"Acme Ltd" is still in use by 2 tasks, 1 work order/);
  assert.match(message, /Merge it into another contact/);
  assert.equal(deleteBlockedMessage([]), '');
});

test('a refusal for several contacts lists the first three and counts the rest', () => {
  const many = Array.from({ length: 5 }, (_, i) => ({ id: `c${i}`, name: `Client ${i}` }));
  const links = tallyLinks(many.map((c, i) => hit(c.id, 'invoices', `i${i}`)));
  const message = deleteBlockedMessage(planContactDelete(many, links).blocked);
  assert.match(message, /^5 of these contacts are still in use: "Client 0" \(1 invoice\), "Client 1" \(1 invoice\), "Client 2" \(1 invoice\) and 2 more\./);
});

test('the error carries the blocked contacts so a screen can explain them', () => {
  const plan = planContactDelete([people[0]], tallyLinks([hit('c1', 'projects', 'p1')]));
  const error = new ContactInUseError(plan.blocked);
  assert.equal(error.name, 'ContactInUseError');
  assert.equal(error.blocked.length, 1);
  assert.match(error.message, /1 project/);
  assert.ok(error instanceof Error);
});

test('every place a contact can be linked is checked, using the same list as the merge', () => {
  const collections = new Set(CONTACT_REFERENCES.map((ref) => ref.collection));
  for (const wanted of ['tasks', 'projects', 'quotes', 'invoices', 'workOrders', 'timeLogs', 'leaveRequests', 'inventoryItems']) {
    assert.ok(collections.has(wanted), `${wanted} is not checked`);
  }
});

test('every contact delete goes through the one guarded function', () => {
  const read = (file: string) => fs.readFileSync(file, 'utf8');
  const payroll = read('src/services/payroll-service.ts');
  const body = (name: string) => payroll.slice(payroll.indexOf(`export async function ${name}(`)).split('\n}')[0];
  for (const name of ['deleteWorker', 'deleteWorkers']) {
    assert.match(body(name), /deleteContacts\(/, `${name} must use deleteContacts`);
    assert.ok(!/deleteDoc\(|batch\.delete/.test(body(name)), `${name} must not delete records itself`);
  }
  const contacts = read('src/services/contact-service.ts');
  assert.match(contacts.slice(contacts.indexOf('export async function deleteContacts(')), /getContactLinks\(/);
});

test('removing a team member keeps their contact when work still names it', () => {
  const read = (file: string) => fs.readFileSync(file, 'utf8');
  const actions = read('src/app/actions/org-actions.ts');
  const body = actions.slice(actions.indexOf('export async function removeUser('));
  assert.match(body, /countContactLinks\(/);
  assert.match(body, /contactKept/);
  // the contact delete sits in the branch where nothing is linked
  assert.match(body, /else \{\s*batch\.delete\(adminDb\.collection\('contacts'\)/);
});

test('the screens that delete contacts explain a refusal instead of showing a bare failure', () => {
  const read = (file: string) => fs.readFileSync(file, 'utf8');
  for (const file of ['src/components/contacts/contacts-view.tsx', 'src/app/(app)/crm/plan/page.tsx']) {
    assert.match(read(file), /blockedContactsFrom\(error\)/, `${file} must explain a refusal`);
    assert.match(read(file), /ContactInUseDialog/, `${file} must show the dialog`);
  }
});