import assert from 'node:assert/strict';
import test from 'node:test';

import { planUnscopedCleanup } from '../src/lib/data-cleanup-unscoped';

const none = new Set<string>();

test('records with no workspace and nothing pointing at them are deleted; workspace records are never listed', () => {
  const plan = planUnscopedCleanup(
    [{ id: 'f1' }, { id: 'f2', parentId: 'f1' }, { id: 'mine', orgId: 'o1' }],
    [{ id: 'a', folderId: 'f2' }, { id: 'b', orgId: 'o1', folderId: 'mine' }],
    none
  );
  assert.deepEqual(plan.deleteFolders.sort(), ['f1', 'f2']);
  assert.deepEqual(plan.deleteFiles, ['a']);
  assert.equal(plan.kept.length, 0);
});

test('a workspace folder inside a no-workspace folder keeps it and the folders above it', () => {
  const plan = planUnscopedCleanup(
    [{ id: 'root' }, { id: 'mid', parentId: 'root' }, { id: 'leaf', orgId: 'o1', parentId: 'mid' }, { id: 'other' }],
    [],
    none
  );
  assert.deepEqual(plan.deleteFolders, ['other']);
  assert.deepEqual(plan.kept.map((k) => k.id).sort(), ['mid', 'root']);
});

test('a workspace file inside a no-workspace folder keeps that folder', () => {
  const plan = planUnscopedCleanup([{ id: 'f1' }], [{ id: 'x', orgId: 'o1', folderId: 'f1' }], none);
  assert.deepEqual(plan.deleteFolders, []);
  assert.equal(plan.kept[0].id, 'f1');
});

test('a record elsewhere that names a file or folder keeps it, and a kept file keeps its folder', () => {
  const plan = planUnscopedCleanup(
    [{ id: 'f1' }, { id: 'f2' }],
    [{ id: 'doc', folderId: 'f1' }, { id: 'gone', folderId: 'f2' }],
    new Set(['doc', 'f2'])
  );
  assert.deepEqual(plan.deleteFiles, ['gone']);
  assert.deepEqual(plan.deleteFolders, []);
  assert.deepEqual(plan.kept.map((k) => `${k.kind}:${k.id}`).sort(), ['file:doc', 'folder:f1', 'folder:f2']);
});
