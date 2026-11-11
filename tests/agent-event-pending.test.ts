import assert from 'node:assert/strict';
import test from 'node:test';

import { changeEventHandler } from '../src/ai/agent-event-tool';
import { NOW, at, cancel, ctx, editor, later, seed } from './event-fixtures';
import { fakeDb } from './fake-db';

test('THE GATE: a preview goes stale after 10 minutes, and a newer preview replaces an older one', async () => {
  const stale = fakeDb(seed());
  await changeEventHandler(stale, editor, cancel(), { confirmed: false, now: NOW });
  assert.equal((await changeEventHandler(stale, editor, cancel(), { confirmed: true, turnStartedAt: later(11 - 0.5), now: later(11) })).status, 'preview');
  assert.ok(stale.store.tasks.e1);

  const fresh = fakeDb(seed());
  await changeEventHandler(fresh, editor, cancel(), { confirmed: false, now: NOW });
  assert.equal((await changeEventHandler(fresh, editor, cancel(), { confirmed: true, turnStartedAt: later(9 - 0.5), now: later(9) })).status, 'done');

  const replaced = fakeDb(seed());
  await changeEventHandler(replaced, editor, cancel('e1'), { confirmed: false, now: NOW });
  await changeEventHandler(replaced, editor, cancel('e2'), { confirmed: false, now: later(1) });
  assert.equal(replaced.store.aiPendingChanges.u1.eventId, 'e2');
  assert.equal((await changeEventHandler(replaced, editor, cancel('e1'), { confirmed: true, turnStartedAt: later(2 - 0.5), now: later(2) })).status, 'preview', 'e1 is no longer the pending change');
  assert.ok(replaced.store.tasks.e1);
});

test('THE GATE: if the event changed after the preview, nothing is applied', async () => {
  const db = fakeDb(seed());
  await changeEventHandler(db, editor, cancel(), { confirmed: false, now: NOW });
  db.store.tasks.e1.start = at('2026-11-12T19:00:00Z');
  const result = await changeEventHandler(db, editor, cancel(), { confirmed: true, turnStartedAt: later(1 - 0.5), now: later(1) });
  assert.notEqual(result.status, 'done');
  assert.ok(db.store.tasks.e1, 'still there');
});

test('THE GATE: a preview made in THIS turn cannot be confirmed in this turn, however many times the tool is called', async () => {
  // The user said yes to an earlier preview; in the same turn the model previews and then "confirms" something else.
  const db = fakeDb(seed());
  const thisTurn = { confirmed: true, turnStartedAt: NOW, now: NOW };
  const first = await changeEventHandler(db, editor, cancel('e1'), thisTurn);
  const second = await changeEventHandler(db, editor, cancel('e1'), { ...thisTurn, now: later(0.01) });
  assert.equal(first.status, 'preview');
  assert.equal(second.status, 'preview', 'the preview it just made is newer than this turn, so a yes cannot apply it');
  assert.ok(db.store.tasks.e1, 'the event is still there after both calls');
  // The next turn, with a real yes, does apply it.
  const next = await changeEventHandler(db, editor, cancel('e1'), { confirmed: true, turnStartedAt: later(2), now: later(2.5) });
  assert.equal(next.status, 'done');
  assert.equal(db.store.tasks.e1, undefined);
});

test('THE GATE: with no turn start supplied, or one that is not a time, nothing is ever applied', async () => {
  for (const turnStartedAt of [undefined, new Date(NaN)]) {
    const db = fakeDb(seed());
    await changeEventHandler(db, editor, cancel(), { confirmed: false, now: NOW });
    const result = await changeEventHandler(db, editor, cancel(), { confirmed: true, turnStartedAt, now: later(1) });
    assert.equal(result.status, 'preview', String(turnStartedAt));
    assert.ok(db.store.tasks.e1);
  }
});

test("one person's pending change cannot be confirmed by another person", async () => {
  const db = fakeDb(seed());
  await changeEventHandler(db, editor, cancel('e1'), { confirmed: false, now: NOW });
  const other = await changeEventHandler(db, ctx('u2', 'editor'), cancel('e1'), { confirmed: true, turnStartedAt: later(1 - 0.5), now: later(1) });
  assert.equal(other.status, 'refused', "e1 is not u2's event");
  assert.ok(db.store.tasks.e1);
});
