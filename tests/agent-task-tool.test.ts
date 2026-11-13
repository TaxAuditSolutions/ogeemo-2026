import assert from 'node:assert/strict';
import test from 'node:test';

import { createTaskHandler } from '../src/ai/agent-task-tool';
import { readToolContext } from '../src/lib/ai-runtime';
import { fakeDb } from './fake-db';

const NOW = new Date('2026-11-09T17:00:00Z');
const seed = () => ({
  contacts: { c1: { orgId: 'orgA', name: 'Dana' }, cOther: { orgId: 'orgB', name: 'Other' } },
  projects: { p1: { orgId: 'orgA', name: 'Site', steps: [{ id: 'old', title: 'Old step' }] }, pOther: { orgId: 'orgB', name: 'Theirs' } },
  tasks: {},
});
const editor = readToolContext({ userId: 'u1', orgId: 'orgA', accessLevel: 'editor', timeZone: 'America/Toronto' });

test('a created task is saved with the workspace and author so the app lists it', async () => {
  const db = fakeDb(seed());
  const result = await createTaskHandler(db, editor, { title: 'Call the bank' }, NOW);
  assert.equal(result.success, true);
  const saved = db.store.tasks[(result as any).taskId];
  assert.equal(saved.orgId, 'orgA');
  assert.equal(saved.userId, 'u1');
  assert.equal(saved.createdBy, 'u1');
  assert.equal(saved.isTodoItem, true);
  assert.equal(saved.status, 'todo');
});

test('a scheduled task is read in the user zone and the answer names the local time', async () => {
  const db = fakeDb(seed());
  const result = await createTaskHandler(db, editor, { title: 'Meeting', startTime: '2026-11-10T15:00:00' }, NOW);
  assert.equal(result.success, true);
  const saved = db.store.tasks[(result as any).taskId];
  assert.equal(saved.start.toISOString(), '2026-11-10T20:00:00.000Z');
  assert.equal(saved.isScheduled, true);
  assert.match(result.message, /Tuesday, November 10, 2026/);
  assert.match(result.message, /3:00/);
});

test('the result says which screen the task landed on, so the browser can open it', async () => {
  const plain: any = await createTaskHandler(fakeDb(seed()), editor, { title: 'Call the bank' }, NOW);
  assert.equal(plain.screen, 'todo');
  const timed: any = await createTaskHandler(fakeDb(seed()), editor, { title: 'Meeting', startTime: '2026-11-10T15:00:00' }, NOW);
  assert.equal(timed.screen, 'calendar');
  const inProject: any = await createTaskHandler(fakeDb(seed()), editor, { title: 'Draft layout', projectId: 'p1' }, NOW);
  assert.equal(inProject.success, true);
  assert.equal(inProject.screen, undefined, 'a task inside a project is on neither screen');
});

test('a viewer, a guest and a missing workspace cannot create a task, and nothing is written', async () => {
  for (const ctx of [
    readToolContext({ userId: 'u1', orgId: 'orgA', accessLevel: 'viewer' }),
    readToolContext({ userId: 'u1', orgId: 'orgA' }),
    readToolContext(undefined),
    readToolContext({ userId: 'u1', accessLevel: 'editor' }),
  ]) {
    const db = fakeDb(seed());
    const result = await createTaskHandler(db, ctx, { title: 'x' }, NOW);
    assert.equal(result.success, false);
    assert.equal(Object.keys(db.store.tasks).length, 0);
  }
});

test('with no database the task is NOT reported as created', async () => {
  const result = await createTaskHandler(null, editor, { title: 'x' }, NOW);
  assert.equal(result.success, false);
  assert.match(result.message, /NOT created/);
});

test('a contact or project from another workspace, or one that does not exist, is refused', async () => {
  const db = fakeDb(seed());
  assert.match((await createTaskHandler(db, editor, { title: 'x', contactId: 'cOther' }, NOW)).message, /contact was not found in this workspace/);
  assert.match((await createTaskHandler(db, editor, { title: 'x', contactId: 'missing' }, NOW)).message, /contact was not found/);
  assert.match((await createTaskHandler(db, editor, { title: 'x', projectId: 'pOther' }, NOW)).message, /project was not found in this workspace/);
  assert.equal(Object.keys(db.store.tasks).length, 0);
  assert.equal(db.store.projects.pOther.steps, undefined);
});

test('a task in a project also becomes a step of that project, keeping the existing steps', async () => {
  const db = fakeDb(seed());
  const result = await createTaskHandler(db, editor, { title: 'Draft layout', projectId: 'p1', contactId: 'c1' }, NOW);
  assert.equal(result.success, true);
  const id = (result as any).taskId;
  assert.equal(db.store.tasks[id].stepId, `step_${id}`);
  assert.equal(db.store.tasks[id].contactId, 'c1');
  assert.deepEqual(db.store.projects.p1.steps.map((s: any) => s.id), ['old', `step_${id}`]);
  assert.equal(db.store.tasks[id].isTodoItem, false);
});

test('bad input comes back as a message the model can act on, with nothing saved', async () => {
  const db = fakeDb(seed());
  assert.match((await createTaskHandler(db, editor, { title: '  ' }, NOW)).message, /needs a title/);
  assert.match((await createTaskHandler(db, editor, { title: 'x', startTime: 'tomorrow' }, NOW)).message, /not a date and time/);
  assert.match((await createTaskHandler(db, editor, { title: 'x', startTime: '2026-11-10T10:00:00', endTime: '2026-11-10T09:00:00' }, NOW)).message, /after the start/);
  assert.equal(Object.keys(db.store.tasks).length, 0);
});

test('a write that fails is reported as a failure, not a success', async () => {
  const db = fakeDb(seed());
  db.failWrites.value = true;
  const result = await createTaskHandler(db, editor, { title: 'x' }, NOW);
  assert.equal(result.success, false);
  assert.match(result.message, /could not be saved/);
});
