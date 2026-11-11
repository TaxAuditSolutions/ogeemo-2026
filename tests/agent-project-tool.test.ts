import assert from 'node:assert/strict';
import test from 'node:test';

import { createProjectHandler } from '../src/ai/agent-project-tool';
import { readToolContext } from '../src/lib/ai-runtime';
import { fakeDb } from './fake-db';

const NOW = new Date('2026-11-11T15:00:00Z');
const seed = () => ({
  contacts: { c1: { orgId: 'orgA', name: 'Dana' }, cOther: { orgId: 'orgB', name: 'Other' } },
  projects: { p1: { orgId: 'orgA', name: 'Website Redesign' }, pOther: { orgId: 'orgB', name: 'Secret Launch' } },
});
const editor = readToolContext({ userId: 'u1', orgId: 'orgA', accessLevel: 'editor', timeZone: 'America/Toronto' });

test('a created project is saved in the signed-in workspace with Planning status and says where it is', async () => {
  const db = fakeDb(seed());
  const result = await createProjectHandler(db, editor, { name: 'Audit Prep', description: 'Year end' }, NOW);
  assert.equal(result.success, true);
  assert.match(result.message, /Created the project "Audit Prep" with Planning status/);
  assert.match(result.message, /\/projects\/all/);
  const saved = db.store.projects[(result as any).projectId];
  assert.equal(saved.orgId, 'orgA');
  assert.equal(saved.userId, 'u1');
  assert.equal(saved.createdBy, 'u1');
  assert.equal(saved.status, 'planning');
  assert.deepEqual(saved.steps, []);
});

test('a client must be a contact of this workspace', async () => {
  const db = fakeDb(seed());
  const ok = await createProjectHandler(db, editor, { name: 'For Dana', contactId: 'c1' }, NOW);
  assert.equal(ok.success, true);
  assert.equal(db.store.projects[(ok as any).projectId].contactId, 'c1');
  const before = Object.keys(db.store.projects).length;
  for (const contactId of ['cOther', 'missing']) {
    const result = await createProjectHandler(db, editor, { name: 'Nope', contactId }, NOW);
    assert.equal(result.success, false);
    assert.match(result.message, /contact was not found in this workspace/);
  }
  assert.equal(Object.keys(db.store.projects).length, before);
});

test('a project with the same name is held back until the user says so; another workspace name does not count', async () => {
  const db = fakeDb(seed());
  const held = await createProjectHandler(db, editor, { name: '  website  REDESIGN ' }, NOW);
  assert.equal(held.success, false);
  assert.match(held.message, /already exists/);
  assert.match(held.message, /allowDuplicate/);
  assert.equal(Object.keys(db.store.projects).length, 2);

  const again = await createProjectHandler(db, editor, { name: 'Website Redesign', allowDuplicate: true }, NOW);
  assert.equal(again.success, true);
  assert.equal(Object.keys(db.store.projects).length, 3);

  const otherWorkspaceName = await createProjectHandler(db, editor, { name: 'Secret Launch' }, NOW);
  assert.equal(otherWorkspaceName.success, true);
});

test('a viewer, a guest and a missing workspace cannot create a project, and nothing is written', async () => {
  for (const ctx of [
    readToolContext({ userId: 'u1', orgId: 'orgA', accessLevel: 'viewer' }),
    readToolContext({ userId: 'u1', orgId: 'orgA' }),
    readToolContext(undefined),
    readToolContext({ userId: 'u1', accessLevel: 'editor' }),
  ]) {
    const db = fakeDb(seed());
    const result = await createProjectHandler(db, ctx, { name: 'x' }, NOW);
    assert.equal(result.success, false);
    assert.equal(Object.keys(db.store.projects).length, 2);
  }
});

test('with no database the project is NOT reported as created', async () => {
  const result = await createProjectHandler(null, editor, { name: 'x' }, NOW);
  assert.equal(result.success, false);
  assert.match(result.message, /NOT created/);
});

test('a missing name asks for one, with nothing saved', async () => {
  const db = fakeDb(seed());
  const result = await createProjectHandler(db, editor, { name: '  ' }, NOW);
  assert.equal(result.success, false);
  assert.match(result.message, /needs a name/);
  assert.equal(Object.keys(db.store.projects).length, 2);
});

test('a write that fails is reported as a failure, not a success', async () => {
  const db = fakeDb(seed());
  db.failWrites.value = true;
  const result = await createProjectHandler(db, editor, { name: 'Fresh' }, NOW);
  assert.equal(result.success, false);
  assert.match(result.message, /could not be saved/);
  assert.equal(Object.keys(db.store.projects).length, 2);
});
