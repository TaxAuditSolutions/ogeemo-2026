import assert from 'node:assert/strict';
import test from 'node:test';

import { planReferenceRepairs, type ContactInfo, type PersonLink, type RefRow } from '../src/lib/data-cleanup';

const contacts = new Map<string, ContactInfo>([
  ['c-ogeemo', { id: 'c-ogeemo', orgId: 'ogeemo' }],
  ['c-other', { id: 'c-other', orgId: 'zzz' }],
  ['c-real', { id: 'c-real', orgId: 'ogeemo' }],
]);
const people = new Map<string, PersonLink>([
  ['u-ok', { uid: 'u-ok', contactId: 'c-ogeemo' }],
  ['u-cross', { uid: 'u-cross', contactId: 'c-other' }],
  ['u-nocontact', { uid: 'u-nocontact' }],
]);
const row = (extra: Partial<RefRow>): RefRow => ({ collection: 'tasks', docId: 'd1', field: 'workerId', value: 'u-ok', orgId: 'ogeemo', locked: false, ...extra });

test('a worker field holding a sign-in id is pointed at that person\'s contact in the same workspace', () => {
  const { repairs, kept } = planReferenceRepairs([row({})], contacts, people);
  assert.equal(kept.length, 0);
  assert.deepEqual(repairs.map((r) => [r.from, r.to, r.field]), [['u-ok', 'c-ogeemo', 'workerId']]);
});

test('a person whose contact is in ANOTHER workspace, or who has no contact, is left alone', () => {
  const { repairs, kept } = planReferenceRepairs([row({ value: 'u-cross' }), row({ value: 'u-nocontact', docId: 'd2' })], contacts, people);
  assert.equal(repairs.length, 0);
  assert.match(kept[0].reason, /another workspace/);
  assert.match(kept[1].reason, /no contact record/);
});

test('an invoiced or paid record, and a record with no workspace, are never touched', () => {
  const { repairs, kept } = planReferenceRepairs([row({ locked: true }), row({ orgId: null, docId: 'd2' }), row({ orgId: undefined, docId: 'd3' })], contacts, people);
  assert.equal(repairs.length, 0);
  assert.match(kept[0].reason, /no workspace/.test(kept[0].reason) ? /no workspace/ : /invoiced or paid/);
  assert.ok(kept.some((k) => /invoiced or paid/.test(k.reason)));
  assert.ok(kept.some((k) => /no workspace/.test(k.reason)));
});

test('a reference that is already a real contact is not a problem at all', () => {
  const { repairs, kept } = planReferenceRepairs([row({ value: 'c-real' })], contacts, people);
  assert.equal(repairs.length + kept.length, 0);
});

test('a task\'s client that exists nowhere is cleared, but only on tasks', () => {
  const { repairs, kept } = planReferenceRepairs(
    [
      row({ field: 'contactId', value: 'nobody' }),
      row({ collection: 'invoices', field: 'contactId', value: 'nobody', docId: 'd2' }),
      row({ collection: 'timeLogs', field: 'contactId', value: 'nobody', docId: 'd3' }),
    ],
    contacts,
    people
  );
  assert.deepEqual(repairs.map((r) => [r.collection, r.to]), [['tasks', null]]);
  assert.equal(kept.length, 2);
});

test('a removed worker\'s history is kept rather than blanked', () => {
  const { repairs, kept } = planReferenceRepairs([row({ value: 'removed-person' }), row({ collection: 'timeLogs', value: 'removed-person', docId: 'd2' })], contacts, people);
  assert.equal(repairs.length, 0);
  assert.match(kept[0].reason, /history is worth keeping/);
});

test('a supplier field never takes a person\'s contact, even for a known sign-in id', () => {
  const { repairs } = planReferenceRepairs([row({ collection: 'invoices', field: 'supplierId', value: 'u-ok' })], contacts, people);
  assert.equal(repairs.length, 0);
});
