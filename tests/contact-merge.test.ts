import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  CONTACT_REFERENCES,
  MERGE_BATCH_SIZE,
  buildMergePatch,
  chunkItems,
  groupReassignments,
  summarizeReassignments,
} from '../src/lib/contact-merge';

test('master details are never overwritten, only blanks are filled', () => {
  const patch = buildMergePatch(
    { name: 'Dan Wiebe', email: 'dan@master.com', cellPhone: '' },
    { name: 'D. Wiebe', email: 'old@dupe.com', cellPhone: '604-555-0100', website: 'dupe.example' },
  );
  assert.equal(patch.email, undefined, 'existing master email must be kept');
  assert.equal(patch.cellPhone, '604-555-0100');
  assert.equal(patch.website, 'dupe.example');
});

test('whitespace-only master values count as blank', () => {
  assert.equal(buildMergePatch({ email: '   ' }, { email: 'a@b.com' }).email, 'a@b.com');
});

test('an address is copied as a whole block or not at all', () => {
  const filled = buildMergePatch({}, { streetAddress: '1 Main St', city: 'Surrey', country: 'CA' });
  assert.deepEqual(
    { street: filled.streetAddress, city: filled.city, country: filled.country },
    { street: '1 Main St', city: 'Surrey', country: 'CA' },
  );

  const mixed = buildMergePatch({ city: 'Vancouver' }, { streetAddress: '1 Main St', city: 'Surrey', postalCode: 'V3T 1A1' });
  assert.equal(mixed.streetAddress, undefined, 'a master with any address must not get a hybrid address');
  assert.equal(mixed.city, undefined);
  assert.equal(mixed.postalCode, undefined);
});

test('notes are preserved: blank master takes them, otherwise they are appended once', () => {
  assert.equal(buildMergePatch({}, { notes: 'Prefers email' }).notes, 'Prefers email');
  assert.equal(
    buildMergePatch({ notes: 'VIP' }, { name: 'D. Wiebe', notes: 'Prefers email' }).notes,
    'VIP\n\n[Merged from D. Wiebe] Prefers email',
  );
  assert.equal(buildMergePatch({ notes: 'VIP. Prefers email' }, { notes: 'Prefers email' }).notes, undefined, 'already present');
  assert.equal(buildMergePatch({ notes: 'VIP' }, { notes: '   ' }).notes, undefined);
});

test('identity, folder, payroll and HR data are never copied to the master', () => {
  const patch = buildMergePatch(
    {},
    {
      name: 'Other', folderId: 'f2', documentFolderId: 'd2', userId: 'u2', orgId: 'o2',
      sin: '123456789', payRate: 40, workerType: 'employee', hireDate: '2020-01-01', emergencyContactName: 'X',
    },
  );
  assert.deepEqual(patch, {});
});

test('chunkItems splits into write-batch sized groups', () => {
  const items = Array.from({ length: MERGE_BATCH_SIZE * 2 + 5 }, (_, i) => i);
  const chunks = chunkItems(items);
  assert.deepEqual(chunks.map((c) => c.length), [MERGE_BATCH_SIZE, MERGE_BATCH_SIZE, 5]);
  assert.deepEqual(chunkItems([]), []);
  assert.ok(MERGE_BATCH_SIZE < 500, 'must stay under the Firestore batch limit');
});

test('a record naming the duplicate in two fields is updated once', () => {
  const grouped = groupReassignments([
    { path: 'tasks/t1', collection: 'tasks', field: 'contactId' },
    { path: 'tasks/t1', collection: 'tasks', field: 'workerId' },
    { path: 'tasks/t2', collection: 'tasks', field: 'contactId' },
    { path: 'tasks/t1', collection: 'tasks', field: 'workerId' },
  ]);
  assert.equal(grouped.length, 2);
  assert.deepEqual(grouped.find((g) => g.path === 'tasks/t1')?.fields, ['contactId', 'workerId']);
});

test('the reassignment summary is readable and handles nothing linked', () => {
  assert.equal(summarizeReassignments({ tasks: 3, invoices: 1, projects: 0 }), '3 tasks, 1 invoice');
  assert.equal(summarizeReassignments({}), 'no linked records');
  assert.equal(summarizeReassignments({ workOrders: 2 }), '2 work orders');
});

test('every referenced collection exists in firestore.rules (no phantom collections)', () => {
  const rules = fs.readFileSync('firestore.rules', 'utf8');
  for (const collection of new Set(CONTACT_REFERENCES.map((ref) => ref.collection))) {
    assert.ok(rules.includes(`match /${collection}/`), `${collection} is not a collection in firestore.rules`);
  }
});

test('reference list has no duplicates and covers the key work records', () => {
  const keys = CONTACT_REFERENCES.map((ref) => `${ref.collection}.${ref.field}`);
  assert.equal(new Set(keys).size, keys.length);
  for (const required of ['tasks.contactId', 'projects.contactId', 'invoices.contactId', 'quotes.contactId', 'timeLogs.contactId', 'tasks.workerId']) {
    assert.ok(keys.includes(required), `missing ${required}`);
  }
});

test('worker merge delegates to the contact merge instead of keeping its own partial logic', () => {
  const source = fs.readFileSync('src/services/payroll-service.ts', 'utf8');
  const fn = source.slice(source.indexOf('export function mergeWorkers'));
  const body = fn.slice(0, fn.indexOf('\n}') + 2);
  assert.match(body, /return mergeContacts\(sourceWorkerId, masterWorkerId\)/);
  assert.ok(!/batch\.delete|deleteDoc/.test(body), 'mergeWorkers must not delete records itself');
});

test('the contact merge refuses to delete a contact linked to a sign-in account', () => {
  const source = fs.readFileSync('src/services/contact-service.ts', 'utf8');
  const merge = source.slice(source.indexOf('export async function mergeContacts'));
  const guard = merge.indexOf("collection(db, 'users')");
  const firstWrite = merge.indexOf('batch.update');
  const deletion = merge.indexOf('await deleteDoc(sourceRef)');
  assert.ok(guard > -1, 'linked-account guard is missing');
  assert.ok(guard < firstWrite, 'the guard must run before anything is changed');
  assert.ok(firstWrite < deletion, 'the duplicate must be deleted after records are re-pointed');
});

test('the reference list matches the contact id fields the services actually write', () => {
  const read = (file: string) => fs.readFileSync(file, 'utf8');
  assert.match(read('src/types/calendar-types.ts'), /contactId\?: string \| null;/);
  assert.match(read('src/services/timelog-service.ts'), /contactId: data\.contactId/);
  assert.match(read('src/services/project-service.ts'), /clientId: data\.clientId/);
  assert.match(read('src/core/accounting-service.ts'), /supplierId: data\.supplierId/);
});
