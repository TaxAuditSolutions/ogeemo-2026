import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAiTask, canCreateTasks } from '../src/lib/ai-task';

const ctx = { userId: 'u1', orgId: 'org1', timeZone: 'America/Toronto', now: new Date('2026-11-09T17:00:00Z') };
const ok = (input: any) => {
  const result = buildAiTask(input, ctx);
  assert.equal(result.ok, true, JSON.stringify(result));
  return (result as any).task;
};

test('only editors and admins may create tasks; a viewer or an unknown role may not', () => {
  assert.equal(canCreateTasks('editor'), true);
  assert.equal(canCreateTasks('org_admin'), true);
  assert.equal(canCreateTasks('super_admin'), true);
  assert.equal(canCreateTasks('viewer'), false);
  assert.equal(canCreateTasks(undefined), false);
  assert.equal(canCreateTasks('owner'), false);
});

test('a task carries the workspace, the author and the fields the app lists tasks by', () => {
  const task = ok({ title: 'Call the bank' });
  assert.equal(task.orgId, 'org1');
  assert.equal(task.userId, 'u1');
  assert.equal(task.createdBy, 'u1');
  assert.equal(task.status, 'todo');
  assert.equal(task.projectId, null);
  assert.equal(task.contactId, null);
  assert.equal(task.stepId, null);
});

test('a plain task with no date and no project is a to-do item; a dated or project task is not', () => {
  assert.equal(ok({ title: 'Plain' }).isTodoItem, true);
  assert.equal(ok({ title: 'Dated', startTime: '2026-11-10T15:00:00' }).isTodoItem, false);
  assert.equal(ok({ title: 'In a project', projectId: 'p1' }).isTodoItem, false);
});

test('a start time is read in the user zone and an end time defaults to one hour later', () => {
  const task = ok({ title: 'Meeting', startTime: '2026-11-10T15:00:00' });
  assert.equal(task.start.toISOString(), '2026-11-10T20:00:00.000Z');
  assert.equal(task.end.toISOString(), '2026-11-10T21:00:00.000Z');
  assert.equal(task.isScheduled, true);
});

test('a summer time set in winter uses the summer offset for that date', () => {
  const task = ok({ title: 'Patio', startTime: '2026-07-10T15:00:00' });
  assert.equal(task.start.toISOString(), '2026-07-10T19:00:00.000Z');
  const other = buildAiTask({ title: 'x', startTime: '2026-07-10T15:00:00' }, { ...ctx, now: new Date('2026-07-01T12:00:00Z') });
  assert.equal((other as any).task.start.toISOString(), '2026-07-10T19:00:00.000Z');
});

test('an explicit end time is kept, and an end before the start is refused', () => {
  const task = ok({ title: 'Workshop', startTime: '2026-11-10T09:00:00', endTime: '2026-11-10T12:30:00' });
  assert.equal(task.end.toISOString(), '2026-11-10T17:30:00.000Z');
  assert.match((buildAiTask({ title: 'x', startTime: '2026-11-10T09:00:00', endTime: '2026-11-10T08:00:00' }, ctx) as any).error, /after the start/);
  assert.match((buildAiTask({ title: 'x', endTime: '2026-11-10T08:00:00' }, ctx) as any).error, /needs a start time/);
});

test('an empty title, a bad date and a bad id are refused with a message the model can act on', () => {
  assert.match((buildAiTask({ title: '  \n ' }, ctx) as any).error, /needs a title/);
  assert.match((buildAiTask({ title: 'x', startTime: 'tomorrow' }, ctx) as any).error, /not a date and time I can use/);
  assert.match((buildAiTask({ title: 'x', startTime: '2026-02-31T10:00:00' }, ctx) as any).error, /not a date and time/);
  assert.match((buildAiTask({ title: 'x', contactId: '../other/doc' }, ctx) as any).error, /contact id is not valid/);
  assert.match((buildAiTask({ title: 'x', projectId: 'a b' }, ctx) as any).error, /project id is not valid/);
});

test('the title is one clean line and the notes are capped', () => {
  const task = ok({ title: 'Line one\nLine two', description: 'n'.repeat(9000) });
  assert.equal(task.title, 'Line one Line two');
  assert.equal(task.description.length, 5000);
});
