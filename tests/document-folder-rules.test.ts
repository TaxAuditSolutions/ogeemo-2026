import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DOCUMENT_SYSTEM_FOLDERS,
  checkDocumentFolderName,
  checkFileName,
  fileMoveProblem,
  folderMoveProblem,
} from '../src/lib/document-folder-rules';

const folders = [
  { id: 'clients', name: 'Clients', parentId: null, isSystem: true },
  { id: 'misc', name: 'Miscellaneous', parentId: null, isSystem: true },
  { id: 'a', name: 'Contracts', parentId: 'clients' },
  { id: 'b', name: '2026', parentId: 'a' },
  { id: 'c', name: 'Scans', parentId: null },
];

test('the document system folders include the ones the guide lists, parents before children', () => {
  const names = DOCUMENT_SYSTEM_FOLDERS.map((f) => f.name);
  assert.equal(names.length, 14);
  for (const f of DOCUMENT_SYSTEM_FOLDERS) {
    if (f.parent) assert.ok(names.indexOf(f.parent) < names.indexOf(f.name), `${f.name} comes before its parent`);
  }
});

test('a folder name that looks like a system folder is refused, including the document-only ones', () => {
  assert.match(checkDocumentFolderName('clients', null, folders)!, /system folder name/);
  assert.match(checkDocumentFolderName(' Knowledge   Base ', null, folders)!, /system folder name/);
  assert.match(checkDocumentFolderName('Marketing', 'a', folders)!, /system folder name/);
  assert.equal(checkDocumentFolderName('Marketing plans', null, folders), null);
});

test('a folder name is checked for blanks, length, slashes and a sibling with the same name', () => {
  assert.match(checkDocumentFolderName('   ', null, folders)!, /Enter a folder name/);
  assert.match(checkDocumentFolderName('x'.repeat(61), null, folders)!, /at most 60/);
  assert.match(checkDocumentFolderName('a/b', null, folders)!, /cannot contain/);
  assert.match(checkDocumentFolderName('contracts', 'clients', folders)!, /already a folder named "Contracts"/);
  assert.equal(checkDocumentFolderName('contracts', 'c', folders), null);
  assert.equal(checkDocumentFolderName('Contracts', 'clients', folders, 'a'), null);
});

test('a file name needs some text, a sane length and no control characters', () => {
  assert.match(checkFileName('   ')!, /Enter a file name/);
  assert.match(checkFileName('x'.repeat(201))!, /at most 200/);
  assert.match(checkFileName('bad\u0007name')!, /control characters/);
  assert.equal(checkFileName('  Lease 2026.pdf '), null);
});

test('a folder cannot be moved into itself, its own subfolder, or a folder that is gone', () => {
  assert.match(folderMoveProblem(folders, 'a', 'a')!, /into itself/);
  assert.match(folderMoveProblem(folders, 'a', 'b')!, /own subfolders/);
  assert.match(folderMoveProblem(folders, 'a', 'gone')!, /no longer exists/);
  assert.match(folderMoveProblem(folders, 'gone', null)!, /no longer exists/);
  assert.equal(folderMoveProblem(folders, 'a', 'c'), null);
  assert.equal(folderMoveProblem(folders, 'b', null), null);
});

test('a system folder cannot be moved, and a move cannot create a same-named sibling', () => {
  assert.match(folderMoveProblem(folders, 'clients', 'c')!, /system folder and cannot be moved/);
  const withTwin = [...folders, { id: 'd', name: 'contracts', parentId: 'c' }];
  assert.match(folderMoveProblem(withTwin, 'a', 'c')!, /already a folder named "contracts" there/);
});

test('a file cannot be dropped on All Files or on a folder that is gone', () => {
  assert.match(fileMoveProblem(folders, null)!, /Drop a file on a folder/);
  assert.match(fileMoveProblem(folders, 'gone')!, /no longer exists/);
  assert.equal(fileMoveProblem(folders, 'a'), null);
});
