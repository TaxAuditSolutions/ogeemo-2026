import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyOrphans, hasWorkerData } from '../src/lib/orphan-contacts';

const folders = [{ id: 'f1', orgId: 'org1' }, { id: 'f2', orgId: 'org2' }];
const ok = { id: 'ok', name: 'Fine', orgId: 'org1', folderId: 'f1' };

test('a contact in a real folder of its own workspace is not an orphan', () => {
  assert.deepEqual(classifyOrphans([ok], folders, {}, {}), []);
});

test('a contact whose folder was deleted is deleted when nothing needs it', () => {
  const rows = classifyOrphans([{ id: 'a', name: 'Lost', orgId: 'org1', folderId: 'gone' }], folders, {}, {});
  assert.deepEqual(rows.map((r) => [r.id, r.kind, r.action]), [['a', 'missing-folder', 'delete']]);
});

test('an orphan that work still names is kept, and the reason says what uses it', () => {
  const rows = classifyOrphans([{ id: 'a', name: 'Acme', orgId: 'org1', folderId: 'gone' }], folders, { a: { invoices: 2, tasks: 1 } }, {});
  assert.equal(rows[0].action, 'keep');
  assert.match(rows[0].reason, /2 invoices, 1 tasks/);
});

test('an orphan linked to a sign-in account is kept', () => {
  const rows = classifyOrphans([{ id: 'a', name: 'Dan', orgId: 'org1', folderId: 'gone' }], folders, {}, { a: 'dan@example.com' });
  assert.equal(rows[0].action, 'keep');
  assert.match(rows[0].reason, /dan@example.com/);
});

test('an orphan with worker or HR data is kept for a person to decide', () => {
  for (const extra of [{ workerType: 'employee' }, { payRate: 25 }, { sin: '046454286' }, { employeeNumber: '1001' }, { payType: 'hourly' }]) {
    const rows = classifyOrphans([{ id: 'a', name: 'W', orgId: 'org1', folderId: 'gone', ...extra }], folders, {}, {});
    assert.equal(rows[0].action, 'keep', JSON.stringify(extra));
  }
  assert.equal(hasWorkerData({ id: 'x', payRate: 0, sin: '', workerType: null }), false);
});

test('a blank folder or a folder in another workspace is reported but never deleted', () => {
  const rows = classifyOrphans(
    [{ id: 'b', name: 'Blank', orgId: 'org1', folderId: '' }, { id: 'c', name: 'Foreign', orgId: 'org1', folderId: 'f2' }],
    folders, {}, {}
  );
  assert.deepEqual(rows.map((r) => [r.id, r.kind, r.action]), [['b', 'no-folder', 'keep'], ['c', 'foreign-folder', 'keep']]);
});

test('rows are grouped by workspace then name', () => {
  const rows = classifyOrphans(
    [{ id: '1', name: 'Zed', orgId: 'org2', folderId: 'x' }, { id: '2', name: 'Bob', orgId: 'org1', folderId: 'x' }, { id: '3', name: 'Al', orgId: 'org1', folderId: 'x' }],
    folders, {}, {}
  );
  assert.deepEqual(rows.map((r) => r.id), ['3', '2', '1']);
});
