import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveDurationSource, isScheduledPlaceholder, computeDurationAndSource } from '../src/lib/duration-source';

// --- resolveDurationSource: explicit field always wins ---

test('resolveDurationSource: explicit durationSource wins over sessions/schedule', () => {
    assert.equal(resolveDurationSource({ durationSource: 'scheduled', isScheduled: true, sessions: [{ durationSeconds: 60 }] }), 'scheduled');
    assert.equal(resolveDurationSource({ durationSource: 'sessions', isScheduled: false }), 'sessions');
    assert.equal(resolveDurationSource({ durationSource: 'manual', isScheduled: false }), 'manual');
});

// --- resolveDurationSource: legacy docs (no field) fall back to a heuristic ---

test('resolveDurationSource: legacy scheduled event with sessions is actual work', () => {
    assert.equal(resolveDurationSource({ isScheduled: true, sessions: [{ durationSeconds: 135 }] }), 'sessions');
});

test('resolveDurationSource: legacy scheduled event without sessions is a schedule placeholder', () => {
    assert.equal(resolveDurationSource({ isScheduled: true, sessions: [] }), 'scheduled');
    assert.equal(resolveDurationSource({ isScheduled: true }), 'scheduled');
});

test('resolveDurationSource: legacy unscheduled event without sessions is manual (HR clock entries etc.)', () => {
    assert.equal(resolveDurationSource({ isScheduled: false }), 'manual');
    assert.equal(resolveDurationSource({}), 'manual');
});

// --- isScheduledPlaceholder gates billing ---

test('isScheduledPlaceholder: only sessionless scheduled events are excluded from billing', () => {
    assert.equal(isScheduledPlaceholder({ durationSource: 'scheduled', isScheduled: true }), true);
    assert.equal(isScheduledPlaceholder({ durationSource: 'sessions', isScheduled: true }), false);
    assert.equal(isScheduledPlaceholder({ durationSource: 'manual' }), false);
    assert.equal(isScheduledPlaceholder({ isScheduled: true, sessions: [{ durationSeconds: 1 }] }), false);
});

// --- computeDurationAndSource: the Activity duration + provenance rule ---

test('computeDurationAndSource: scheduled span becomes a labelled placeholder when no session exists', () => {
    // Beta scenario: billable Activity scheduled 10:20-11:20 (3600s), no session yet.
    const result = computeDurationAndSource({ sessions: [], elapsedSeconds: 0, scheduledSpanSeconds: 3600 });
    assert.equal(result.durationSeconds, 3600);
    assert.equal(result.source, 'scheduled');
});

test('computeDurationAndSource: an actual session replaces the scheduled span (no duplicate, shorter wins)', () => {
    // Same Activity after logging a 00:02:15 session: duration must be the session's.
    const result = computeDurationAndSource({ sessions: [{ durationSeconds: 135 }], elapsedSeconds: 0, scheduledSpanSeconds: 3600 });
    assert.equal(result.durationSeconds, 135);
    assert.equal(result.source, 'sessions');
});

test('computeDurationAndSource: multiple sessions accumulate', () => {
    const result = computeDurationAndSource({ sessions: [{ durationSeconds: 60 }, { durationSeconds: 75 }], elapsedSeconds: 0, scheduledSpanSeconds: 3600 });
    assert.equal(result.durationSeconds, 135);
    assert.equal(result.source, 'sessions');
});

test('computeDurationAndSource: running timer adds to session time', () => {
    const result = computeDurationAndSource({ sessions: [{ durationSeconds: 60 }], elapsedSeconds: 30, scheduledSpanSeconds: 0 });
    assert.equal(result.durationSeconds, 90);
    assert.equal(result.source, 'sessions');
});

test('computeDurationAndSource: timer alone (no logged session yet) is actual work, not scheduled time', () => {
    const result = computeDurationAndSource({ sessions: [], elapsedSeconds: 45, scheduledSpanSeconds: 3600 });
    assert.equal(result.durationSeconds, 45);
    assert.equal(result.source, 'sessions');
});

test('computeDurationAndSource: nothing to show yields zero duration with no source', () => {
    const result = computeDurationAndSource({ sessions: [], elapsedSeconds: 0, scheduledSpanSeconds: 0 });
    assert.equal(result.durationSeconds, 0);
    assert.equal(result.source, null);
});

// --- End-to-end model: the tester's retest sequence ---

test('model: scheduled -> session -> reopen keeps one consistent, deliberately-sourced duration', () => {
    // 1. Create one-hour scheduled billable Activity, no session.
    const scheduled = computeDurationAndSource({ sessions: [], elapsedSeconds: 0, scheduledSpanSeconds: 3600 });
    assert.equal(scheduled.durationSeconds, 3600);
    assert.equal(isScheduledPlaceholder({ durationSource: scheduled.source, isScheduled: true }), true); // shown, not billed

    // 2. Record a 00:02:15 session: same entry, actual duration, now billable.
    const afterSession = computeDurationAndSource({ sessions: [{ durationSeconds: 135 }], elapsedSeconds: 0, scheduledSpanSeconds: 3600 });
    assert.equal(afterSession.durationSeconds, 135);
    assert.equal(isScheduledPlaceholder({ durationSource: afterSession.source, isScheduled: true }), false); // billed

    // 3. Close/reopen: persisted durationSource 'sessions' still resolves to work
    //    (the scheduled span must not silently take over again).
    const reopened = resolveDurationSource({ durationSource: afterSession.source, isScheduled: true, sessions: [{ durationSeconds: 135 }] });
    assert.equal(reopened, 'sessions');
});
