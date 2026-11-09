import assert from 'node:assert/strict';
import test from 'node:test';

import { planOrphanRepair } from '../src/lib/document-folder-system';

const folders = [
  { id: 'misc', name: 'Miscellaneous', parentId: null, isSystem: true },
  { id: 'a', name: 'A', parentId: 'misc' },
  { id: 'lost', name: 'Lost', parentId: 'deleted-parent' },
];

test('files whose folder is gone, or blank, go to Miscellaneous; files in real folders stay', () => {
  const files = [
    { id: 'f1', folderId: 'a' },
    { id: 'f2', folderId: 'oct 11 test 2.' },
    { id: 'f3', folderId: null },
    { id: 'f4', folderId: undefined },
    { id: 'f5', folderId: 'misc' },
  ];
  assert.deepEqual(planOrphanRepair(folders, files, 'misc').fileIds, ['f2', 'f3', 'f4']);
});

test('folders whose parent is gone come back to the top level; top-level folders are left alone', () => {
  assert.deepEqual(planOrphanRepair(folders, [], 'misc').folderIds, ['lost']);
});

test('with nowhere to put files, none are moved (the folders are still repaired)', () => {
  const result = planOrphanRepair(folders, [{ id: 'f2', folderId: 'gone' }], null);
  assert.deepEqual(result.fileIds, []);
  assert.deepEqual(result.folderIds, ['lost']);
});

test('a healthy tree needs no repair', () => {
  const healthy = folders.filter((f) => f.id !== 'lost');
  assert.deepEqual(planOrphanRepair(healthy, [{ id: 'f1', folderId: 'a' }], 'misc'), { fileIds: [], folderIds: [] });
});
