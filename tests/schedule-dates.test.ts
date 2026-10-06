import { test } from 'node:test';
import assert from 'node:assert/strict';
import { endFollowsStart, presetHourValue, presetMinuteValue } from '../src/lib/schedule-dates';

const day = (iso: string) => new Date(iso);

test('endFollowsStart: empty End follows a newly chosen Start (autopopulate)', () => {
    assert.equal(endFollowsStart(undefined, undefined), true);
    assert.equal(endFollowsStart(day('2026-10-05'), undefined), true);
});

test('endFollowsStart: End derived from the previous Start keeps following it', () => {
    const start = day('2026-10-05');
    assert.equal(endFollowsStart(start, day('2026-10-05')), true);
});

test('endFollowsStart: a hand-set multi-day End is never stomped by a Start change', () => {
    assert.equal(endFollowsStart(day('2026-10-05'), day('2026-10-10')), false);
    assert.equal(endFollowsStart(day('2026-10-06'), day('2026-10-10')), false);
});

test('endFollowsStart: End chosen before Start stays put', () => {
    assert.equal(endFollowsStart(undefined, day('2026-10-10')), false);
});

test('presetHourValue: zero-pads to the hour select format', () => {
    assert.equal(presetHourValue(new Date('2026-10-05T09:07:00')), '09');
    assert.equal(presetHourValue(new Date('2026-10-05T23:59:00')), '23');
    assert.equal(presetHourValue(new Date('2026-10-05T00:30:00')), '00');
});

test('presetMinuteValue: floors to the 5-minute step (never a future time)', () => {
    assert.equal(presetMinuteValue(new Date('2026-10-05T14:37:00')), '35');
    assert.equal(presetMinuteValue(new Date('2026-10-05T14:00:00')), '00');
    assert.equal(presetMinuteValue(new Date('2026-10-05T14:59:00')), '55');
});
