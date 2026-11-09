import assert from 'node:assert/strict';
import test from 'node:test';

import { pathToFolder, planDocumentFolderDelete, sortFiles } from '../src/lib/document-folder-delete';

const folders = [
  { id: 'clients', name: 'Clients', parentId: null, isSystem: true },
  { id: 'misc', name: 'Miscellaneous', parentId: null, isSystem: true },
  { id: 'a', name: 'Contracts', parentId: 'clients' },
  { id: 'b', name: '2026', parentId: 'a' },
  { id: 'c', name: 'Scans', parentId: null },
];

test('deleting a folder moves its files and subfolders up one level instead of leaving them behind', () => {
  const files = [{ id: 'f1', folderId: 'a' }, { id: 'f2', folderId: 'a' }, { id: 'f3', folderId: 'c' }];
  const plan = planDocumentFolderDelete(folders, files, 'a') as any;
  assert.equal(plan.error, null);
  assert.equal(plan.filesTo, 'clients');
  assert.equal(plan.childrenTo, 'clients');
  assert.deepEqual(plan.fileIds, ['f1', 'f2']);
  assert.deepEqual(plan.childIds, ['b']);
});

test('a top-level folder sends its files to Miscellaneous and its subfolders to the top', () => {
  const plan = planDocumentFolderDelete(folders, [{ id: 'f3', folderId: 'c' }], 'c') as any;
  assert.equal(plan.filesTo, 'misc');
  assert.equal(plan.childrenTo, null);
});

test('a system folder or a missing folder cannot be deleted, and files need somewhere to go', () => {
  assert.match((planDocumentFolderDelete(folders, [], 'clients') as any).error, /system folder and cannot be deleted/);
  assert.match((planDocumentFolderDelete(folders, [], 'gone') as any).error, /no longer exists/);
  const noMisc = folders.filter((f) => f.id !== 'misc');
  assert.match((planDocumentFolderDelete(noMisc, [{ id: 'f3', folderId: 'c' }], 'c') as any).error, /no folder to move its files into/);
  assert.equal((planDocumentFolderDelete(noMisc, [], 'c') as any).error, null);
});

test('the path to a folder runs from the top down and survives a loop', () => {
  assert.deepEqual(pathToFolder(folders, 'b'), ['clients', 'a', 'b']);
  assert.deepEqual(pathToFolder(folders, 'gone'), []);
  const loop = [{ id: 'x', name: 'X', parentId: 'y' }, { id: 'y', name: 'Y', parentId: 'x' }];
  assert.deepEqual(pathToFolder(loop, 'x').sort(), ['x', 'y']);
});

test('files sort by name (case-blind, numbers in order) or by date, without changing the original', () => {
  const files = [
    { name: 'invoice 10', modifiedAt: new Date('2026-01-03') },
    { name: 'Invoice 2', modifiedAt: new Date('2026-01-01') },
    { name: 'apple', modifiedAt: new Date('2026-01-02') },
  ];
  assert.deepEqual(sortFiles(files, 'name', 'asc').map((f) => f.name), ['apple', 'Invoice 2', 'invoice 10']);
  assert.deepEqual(sortFiles(files, 'modifiedAt', 'desc').map((f) => f.name), ['invoice 10', 'apple', 'Invoice 2']);
  assert.equal(files[0].name, 'invoice 10');
  assert.deepEqual(sortFiles([{ name: 'b' }, { name: 'a', modifiedAt: null }], 'modifiedAt', 'asc').map((f) => f.name), ['a', 'b']);
});
