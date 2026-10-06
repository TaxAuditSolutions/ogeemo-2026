import { test } from 'node:test';
import assert from 'node:assert/strict';
import { endFollowsStart } from '../src/lib/schedule-dates';

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
