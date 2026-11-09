import assert from 'node:assert/strict';
import test from 'node:test';

import {
  NO_LINKS,
  blockingReasons,
  taskArchiveProblem,
  taskDeleteProblem,
  workedSecondsOf,
} from '../src/lib/task-links';

const links = (extra: object) => ({ ...NO_LINKS, ...extra });

test('a task nothing depends on can be deleted and archived', () => {
  assert.equal(taskDeleteProblem(NO_LINKS), null);
  assert.equal(taskArchiveProblem(NO_LINKS), null);
  assert.deepEqual(blockingReasons(NO_LINKS), []);
});

test('worked time is the sessions, never a planned schedule span', () => {
  assert.equal(workedSecondsOf({ sessions: [{ durationSeconds: 600 }, { durationSeconds: 300 }] }), 900);
  assert.equal(workedSecondsOf({ sessions: [], duration: 7200, durationSource: 'scheduled' }), 0);
  assert.equal(workedSecondsOf({ sessions: [], duration: 3600, durationSource: 'sessions' }), 3600);
  assert.equal(workedSecondsOf({ duration: 3600, durationSource: 'manual' }), 0);
  assert.equal(workedSecondsOf({}), 0);
});

test('an invoice line, a billed stamp or a quote line blocks both delete and archive', () => {
  for (const extra of [{ invoiceLines: 1 }, { billed: true }, { quoteLines: 2 }]) {
    assert.match(taskDeleteProblem(links(extra))!, /still in use/, JSON.stringify(extra));
    assert.match(taskArchiveProblem(links(extra))!, /cannot be archived/, JSON.stringify(extra));
  }
});

test('the message names what uses the task and how to get out', () => {
  const message = taskDeleteProblem(links({ invoiceLines: 3, quoteLines: 1 }))!;
  assert.match(message, /3 invoice lines and a quote/);
  assert.match(message, /Remove it from there first/);
});

test('an open work order blocks, a finished or cancelled one does not', () => {
  assert.match(taskDeleteProblem(links({ workOrder: { number: 'WO-1', status: 'scheduled' } }))!, /work order WO-1 \(scheduled\)/);
  assert.match(taskArchiveProblem(links({ workOrder: { number: 'WO-1', status: 'in_progress' } }))!, /in progress/);
  assert.equal(taskDeleteProblem(links({ workOrder: { number: 'WO-1', status: 'completed' } })), null);
  assert.equal(taskDeleteProblem(links({ workOrder: { number: 'WO-1', status: 'cancelled' } })), null);
});

test('recorded time blocks an outright delete but not an archive, because the archive keeps it', () => {
  const problem = taskDeleteProblem(links({ workedSeconds: 5400 }))!;
  assert.match(problem, /1h 30m of recorded time/);
  assert.match(problem, /Archive it instead/);
  assert.equal(taskArchiveProblem(links({ workedSeconds: 5400 })), null);
});

test('under a minute of time is shown as one minute, and several reasons are listed together', () => {
  assert.match(taskDeleteProblem(links({ workedSeconds: 20 }))!, /1m of recorded time/);
  const both = taskDeleteProblem(links({ invoiceLines: 1, workOrder: { number: 'WO-9', status: 'pending' }, workedSeconds: 600 }))!;
  assert.match(both, /an invoice and work order WO-9 \(pending\)/);
  // work in use is explained before the time, since time alone is solvable by archiving
  assert.doesNotMatch(both, /Archive it instead/);
});
