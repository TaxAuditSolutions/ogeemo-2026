import assert from 'node:assert/strict';
import test from 'node:test';

import { pickMasterFolder, planDuplicateMerge, planWorkerFolder, systemFolderId } from '../src/lib/document-folder-system';

test('the master system folder is the one already marked system, then the right parent, then the oldest', () => {
  const old = { id: 'o', name: 'Clients', parentId: null, isSystem: false, createdAt: new Date('2025-01-01') };
  const sys = { id: 's', name: 'Clients', parentId: null, isSystem: true, createdAt: new Date('2026-03-01') };
  assert.equal(pickMasterFolder([old, sys], null)?.id, 's');
  const nested = { id: 'n', name: 'Employees', parentId: 'elsewhere', createdAt: new Date('2025-01-01') };
  const right = { id: 'r', name: 'Employees', parentId: 'workers', createdAt: new Date('2026-01-01') };
  assert.equal(pickMasterFolder([nested, right], 'workers')?.id, 'r');
  const a = { id: 'a', name: 'X', parentId: null, createdAt: new Date('2026-01-02') };
  const b = { id: 'b', name: 'X', parentId: null, createdAt: new Date('2026-01-01') };
  assert.equal(pickMasterFolder([a, b], null)?.id, 'b');
  assert.equal(pickMasterFolder([], null), undefined);
});

test('a folder with no date loses a tie to one with a date, and ids break exact ties the same way every time', () => {
  const dated = { id: 'd', name: 'X', parentId: null, createdAt: new Date('2026-01-01') };
  const undated = { id: 'u', name: 'X', parentId: null };
  assert.equal(pickMasterFolder([undated, dated], null)?.id, 'd');
  assert.equal(pickMasterFolder([{ id: 'b', name: 'X' }, { id: 'a', name: 'X' }], null)?.id, 'a');
});

test('the system folder id is stable and safe, so two sign-ins write the same record', () => {
  assert.equal(systemFolderId('orgA', 'Knowledge Base'), 'sys_orgA_knowledge-base');
  assert.equal(systemFolderId('orgA', '  knowledge   base '), 'sys_orgA_knowledge-base');
  assert.notEqual(systemFolderId('orgA', 'Clients'), systemFolderId('orgB', 'Clients'));
  assert.ok(!systemFolderId('o', 'Ogeemo / Users').includes('/'));
});

test('merging duplicates moves their files and their subfolders to the master and never the master itself', () => {
  const folders = [
    { id: 'm', name: 'Clients', parentId: null },
    { id: 'd1', name: 'Clients', parentId: null },
    { id: 'd2', name: 'Clients', parentId: null },
    { id: 'k', name: 'Kept', parentId: 'd1' },
    { id: 'j', name: 'Joined', parentId: 'd2' },
    { id: 'z', name: 'Other', parentId: 'm' },
  ];
  const files = [{ id: 'f1', folderId: 'd1' }, { id: 'f2', folderId: 'm' }, { id: 'f3', folderId: 'd2' }, { id: 'f4', folderId: null }];
  const plan = planDuplicateMerge(folders, files, 'm', ['m', 'd1', 'd2']);
  assert.deepEqual(plan.fileIds, ['f1', 'f3']);
  assert.deepEqual(plan.childIds, ['k', 'j']);
});

test('a worker with no folder gets one under their role, unless a folder with that name is already there', () => {
  const siblings = [{ id: 's1', name: 'Pat Lee' }];
  assert.deepEqual(planWorkerFolder({ name: ' Sam  Roy ', roleParentId: 'emp', siblings }), { action: 'create', name: 'Sam Roy', parentId: 'emp' });
  assert.deepEqual(planWorkerFolder({ name: 'pat lee', roleParentId: 'emp', siblings }), { action: 'keep', folderId: 's1' });
});

test('a worker who already has a folder keeps it: renamed or moved to the new role, never replaced by an empty one', () => {
  const existing = { id: 'e1', name: 'Pat Lee', parentId: 'emp' };
  assert.deepEqual(planWorkerFolder({ name: 'Pat Lee', roleParentId: 'emp', existingFolder: existing, siblings: [] }), { action: 'keep', folderId: 'e1' });
  assert.deepEqual(
    planWorkerFolder({ name: 'Patricia Lee', roleParentId: 'emp', existingFolder: existing, siblings: [] }),
    { action: 'update', folderId: 'e1', name: 'Patricia Lee', parentId: undefined }
  );
  assert.deepEqual(
    planWorkerFolder({ name: 'Pat Lee', roleParentId: 'con', existingFolder: existing, siblings: [] }),
    { action: 'update', folderId: 'e1', name: undefined, parentId: 'con' }
  );
});

test('a rename to a name another worker folder already uses keeps the folder name rather than clashing', () => {
  const existing = { id: 'e1', name: 'Pat Lee', parentId: 'emp' };
  const result = planWorkerFolder({ name: 'Sam Roy', roleParentId: 'emp', existingFolder: existing, siblings: [{ id: 's9', name: 'sam roy' }] });
  assert.deepEqual(result, { action: 'update', folderId: 'e1', name: undefined, parentId: undefined });
});
