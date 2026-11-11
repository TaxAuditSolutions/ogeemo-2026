import assert from 'node:assert/strict';
import test from 'node:test';

import { changeEventHandler } from '../src/ai/agent-event-tool';
import { readToolContext } from '../src/lib/ai-runtime';
import { NOW, cancel, ctx, editor, later, move, seed } from './event-fixtures';
import { fakeDb } from './fake-db';

const run = (db: any, input: any, c = editor) => changeEventHandler(db, c, input, { confirmed: false, now: NOW });

test("only your OWN event can be changed: someone else's, another workspace's and a made-up id are all refused alike", async () => {
  for (const eventId of ['eOther', 'eElsewhere', 'nope', '../x', '']) {
    const db = fakeDb(seed());
    const result = await run(db, cancel(eventId));
    assert.equal(result.status, 'refused', eventId);
    assert.match(result.message, /not one of your own scheduled events|Say which event/, eventId);
    assert.deepEqual(db.store.aiPendingChanges, {}, 'nothing was even saved as pending');
  }
});

test('a viewer, a guest and a missing workspace are refused, and nothing is read or written', async () => {
  const db = fakeDb(seed());
  const before = JSON.stringify(db.store);
  assert.match((await run(db, cancel(), ctx('u1', 'viewer'))).message, /view this workspace but not change events/);
  assert.equal((await run(db, cancel(), ctx('u1'))).status, 'refused');
  assert.match((await run(db, cancel(), readToolContext(undefined))).message, /not authenticated/);
  assert.match((await run(db, cancel(), readToolContext({ userId: 'u1', accessLevel: 'editor' }))).message, /not authenticated/);
  assert.match((await run(null, cancel())).message, /not available/);
  assert.equal(JSON.stringify(db.store), before);
});

test('a bad move is refused with a reason the model can act on, and nothing is saved', async () => {
  const bad: Array<[any, RegExp]> = [
    [move({ startTime: undefined }), /say the new day and time/],
    [move({ startTime: '2026-11-13' }), /no time of day/],
    [move({ startTime: 'tomorrow' }), /not a date and time/],
    [move({ startTime: '2026-11-01T09:00:00' }), /already passed/],
    [move({ startTime: '2026-11-12T20:00:00Z' }), /nothing needs to change/],
    [move({ durationMinutes: 2 }), /between 5 minutes and 12 hours/],
    [move({ endTime: '2026-11-12T09:00:00-05:00' }), /end time must be after/],
    [{ eventId: 'e1', action: 'delete' }, /move or cancel/],
  ];
  for (const [input, words] of bad) {
    const db = fakeDb(seed());
    const result = await run(db, input);
    assert.equal(result.status, 'refused', JSON.stringify(input));
    assert.match(result.message, words, JSON.stringify(input));
    assert.deepEqual(db.store.aiPendingChanges, {});
  }
});

test('an all-day event moved to a time of day becomes an hour long', async () => {
  const db = fakeDb(seed());
  const input = move({ eventId: 'eAllDay', startTime: '2026-11-16T10:00:00-05:00' });
  await changeEventHandler(db, editor, input, { confirmed: false, now: NOW });
  const done = await changeEventHandler(db, editor, input, { confirmed: true, turnStartedAt: later(1 - 0.5), now: later(1) });
  assert.equal(done.status, 'done');
  assert.equal((db.store.tasks.eAllDay.end.getTime() - db.store.tasks.eAllDay.start.getTime()) / 60_000, 60);
});
