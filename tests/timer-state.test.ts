import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseTimerState,
  sessionEndMs,
  sessionSecondsFrom,
  startTimerBlock,
  timerElapsedSeconds,
  type TimerState,
} from '../src/lib/timer-state';

const running: TimerState = {
  eventId: 'e1',
  notes: 'Site visit',
  isActive: true,
  isPaused: false,
  startTime: 1_000_000,
  pauseTime: null,
  totalPausedDuration: 0,
};

test('elapsed is the time since the start, in whole seconds', () => {
  assert.equal(timerElapsedSeconds(running, 1_000_000 + 125_900), 125);
  assert.equal(timerElapsedSeconds(running, 1_000_000), 0);
});

test('paused time is not counted, both earlier pauses and the one in progress', () => {
  const earlier = { ...running, totalPausedDuration: 60 };
  assert.equal(timerElapsedSeconds(earlier, 1_000_000 + 300_000), 240);
  const pausedNow: TimerState = { ...running, isPaused: true, pauseTime: 1_000_000 + 100_000 };
  // 100 s worked, then paused: later clock readings add nothing
  assert.equal(timerElapsedSeconds(pausedNow, 1_000_000 + 100_000), 100);
  assert.equal(timerElapsedSeconds(pausedNow, 1_000_000 + 900_000), 100);
});

test('elapsed is never negative and is 0 for no timer or an inactive one', () => {
  assert.equal(timerElapsedSeconds(null), 0);
  assert.equal(timerElapsedSeconds({ ...running, isActive: false }, 9_000_000), 0);
  assert.equal(timerElapsedSeconds({ ...running, totalPausedDuration: 99_999 }, 1_000_000 + 10_000), 0);
  assert.equal(timerElapsedSeconds(running, 500_000), 0); // a clock set back
});

test('a session that was paused ends when the pause began, not when it was logged', () => {
  const pausedNow: TimerState = { ...running, isPaused: true, pauseTime: 1_500_000 };
  assert.equal(sessionEndMs(pausedNow, 9_999_999), 1_500_000);
  assert.equal(sessionEndMs(running, 2_000_000), 2_000_000);
});

test('stored timer text is read back, and anything malformed is refused instead of thrown', () => {
  assert.deepEqual(parseTimerState(JSON.stringify(running)), running);
  assert.equal(parseTimerState(null), null);
  assert.equal(parseTimerState(''), null);
  assert.equal(parseTimerState('{not json'), null);
  assert.equal(parseTimerState('null'), null);
  assert.equal(parseTimerState('[]'), null);
  assert.equal(parseTimerState(JSON.stringify({ eventId: 'e1' })), null); // no start time
  assert.equal(parseTimerState(JSON.stringify({ ...running, startTime: 'yesterday' })), null);
  assert.equal(parseTimerState(JSON.stringify({ ...running, eventId: '' })), null);
});

test('odd stored values are tidied: negative paused time becomes 0, a bad pause time becomes none', () => {
  const state = parseTimerState(JSON.stringify({ ...running, totalPausedDuration: -50, pauseTime: 'x' }))!;
  assert.equal(state.totalPausedDuration, 0);
  assert.equal(state.pauseTime, null);
});

test('a second timer cannot replace a running one, and the message names the first', () => {
  assert.equal(startTimerBlock(null, 'e2'), null);
  assert.equal(startTimerBlock({ ...running, isActive: false }, 'e2'), null);
  assert.match(startTimerBlock(running, 'e2')!, /already running on "Site visit"/);
  assert.match(startTimerBlock(running, 'e1')!, /already running/);
  assert.match(startTimerBlock({ ...running, notes: '' }, 'e2')!, /another activity/);
});

test('a session length needs whole hours and minutes, at least a minute and at most a day', () => {
  assert.deepEqual(sessionSecondsFrom(1, 30), { ok: true, seconds: 5400 });
  assert.deepEqual(sessionSecondsFrom('', 45), { ok: true, seconds: 2700 });
  assert.deepEqual(sessionSecondsFrom(2, ''), { ok: true, seconds: 7200 });
  for (const bad of [[0, 0], ['', ''], [-1, 5], [1, -5], [1.5, 0], [0, 75], [25, 0], ['a', 1]] as const) {
    assert.equal(sessionSecondsFrom(bad[0], bad[1]).ok, false, JSON.stringify(bad));
  }
  assert.deepEqual(sessionSecondsFrom(24, 0), { ok: true, seconds: 86400 });
});
