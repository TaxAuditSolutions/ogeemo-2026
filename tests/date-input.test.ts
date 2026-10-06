import assert from 'node:assert/strict';
import test from 'node:test';

import { toDateInputValue } from '../src/lib/date-input';

/**
 * Regression: editing a worker whose hireDate is stored as a Firestore
 * Timestamp crashed the Edit Worker dialog with "Invalid time value"
 * (new Date(Timestamp).toISOString()). The converter must accept every
 * storage shape and never throw.
 */

test('date-input: Date instances convert to YYYY-MM-DD', () => {
    assert.equal(toDateInputValue(new Date(Date.UTC(2026, 4, 17))), '2026-05-17');
});

test('date-input: client Timestamps with toDate() convert', () => {
    const stamp = { toDate: () => new Date(Date.UTC(2026, 0, 2)) };
    assert.equal(toDateInputValue(stamp), '2026-01-02');
});

test('date-input: seconds and _seconds shapes convert (the crash input)', () => {
    const seconds = 1782000000;
    const expected = new Date(seconds * 1000).toISOString().split('T')[0];
    assert.equal(toDateInputValue({ seconds }), expected);
    assert.equal(toDateInputValue({ _seconds: seconds, _nanoseconds: 0 }), expected);
});

test('date-input: ISO strings pass through', () => {
    assert.equal(toDateInputValue('2026-03-05'), '2026-03-05');
});

test('date-input: never throws - garbage, empty and unknown shapes become empty string', () => {
    for (const bad of [null, undefined, '', 'not a date', {}, { nanos: 1 }, 0 / 0]) {
        assert.equal(toDateInputValue(bad), '', String(bad));
    }
    assert.doesNotThrow(() => toDateInputValue({ seconds: 'NaN' }));
});