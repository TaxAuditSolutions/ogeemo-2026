import assert from 'node:assert/strict';
import test from 'node:test';

import { changeEventHandler } from '../src/ai/agent-event-tool';
import { NOW, cancel, editor, later, move, seed } from './event-fixtures';
import { fakeDb } from './fake-db';

test('the first call only previews: nothing is moved, and the plan is saved as pending', async () => {
  const db = fakeDb(seed());
  const before = JSON.stringify(db.store.tasks);
  const result = await changeEventHandler(db, editor, move(), { confirmed: false, now: NOW });
  assert.equal(result.status, 'preview');
  assert.equal(result.success, false, 'a preview is not a success');
  assert.match(result.message, /Ready to move "Team call" from [\s\S]* to [\s\S]*4:00[\s\S]*Nothing has changed yet/);
  assert.equal(JSON.stringify(db.store.tasks), before, 'no event was touched');
  assert.equal(db.store.aiPendingChanges.u1.eventId, 'e1');
});

test('a yes after the preview moves the event, keeps its length, and clears the pending change', async () => {
  const db = fakeDb(seed());
  await changeEventHandler(db, editor, move(), { confirmed: false, now: NOW });
  const done = await changeEventHandler(db, editor, move(), { confirmed: true, turnStartedAt: later(1 - 0.5), now: later(1) });
  assert.equal(done.status, 'done');
  assert.equal(done.success, true);
  assert.match(done.message, /Moved "Team call" to .*4:00/);
  assert.equal(db.store.tasks.e1.start.toISOString(), '2026-11-12T21:00:00.000Z');
  assert.equal(db.store.tasks.e1.end.toISOString(), '2026-11-12T22:00:00.000Z');
  assert.equal(db.store.tasks.e1.updatedBy, 'u1');
  assert.equal(db.store.aiPendingChanges.u1, undefined);
});

test('a yes after a cancel preview deletes only that event', async () => {
  const db = fakeDb(seed());
  const preview = await changeEventHandler(db, editor, cancel(), { confirmed: false, now: NOW });
  assert.match(preview.message, /Ready to cancel "Team call"[\s\S]*Nothing has changed yet/);
  const done = await changeEventHandler(db, editor, cancel(), { confirmed: true, turnStartedAt: later(1 - 0.5), now: later(1) });
  assert.equal(done.status, 'done');
  assert.match(done.message, /Cancelled "Team call"/);
  assert.equal(db.store.tasks.e1, undefined);
  assert.ok(db.store.tasks.e2 && db.store.tasks.eOther, 'other events untouched');
});

test('THE GATE: the model cannot confirm for the user. With no yes read by the server, a repeated call only previews', async () => {
  const db = fakeDb(seed());
  await changeEventHandler(db, editor, cancel(), { confirmed: false, now: NOW });
  const again = await changeEventHandler(db, editor, cancel(), { confirmed: false, now: later(1) });
  assert.equal(again.status, 'preview');
  assert.ok(db.store.tasks.e1, 'the event is still there');
  const noOption = await changeEventHandler(db, editor, cancel(), { now: later(1) });
  assert.equal(noOption.status, 'preview', 'confirmed defaults to no');
  assert.ok(db.store.tasks.e1);
});

test('THE GATE: a yes with no preview first is not enough, so a "yes" to something else cannot cancel anything', async () => {
  const db = fakeDb(seed());
  const result = await changeEventHandler(db, editor, cancel(), { confirmed: true, turnStartedAt: NOW, now: NOW });
  assert.equal(result.status, 'preview', 'nothing was pending, so it previews instead of acting');
  assert.ok(db.store.tasks.e1);
});

test('THE GATE: a yes only confirms the exact plan that was shown, never a different event, time or action', async () => {
  const cases: Array<[any, any]> = [
    [cancel('e1'), cancel('e2')],
    [move(), move({ startTime: '2026-11-12T10:00:00-05:00' })],
    [move(), cancel('e1')],
    [cancel('e1'), move()],
    [move(), move({ durationMinutes: 45 })],
  ];
  for (const [shown, asked] of cases) {
    const db = fakeDb(seed());
    const before = JSON.stringify(db.store.tasks);
    await changeEventHandler(db, editor, shown, { confirmed: false, now: NOW });
    const result = await changeEventHandler(db, editor, asked, { confirmed: true, turnStartedAt: later(1 - 0.5), now: later(1) });
    assert.equal(result.status, 'preview', `${JSON.stringify(shown)} then ${JSON.stringify(asked)}`);
    assert.equal(JSON.stringify(db.store.tasks), before, 'nothing changed');
  }
});
