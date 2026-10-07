import { test } from 'node:test';
import assert from 'node:assert/strict';
import { omitUndefined, replaceUndefinedWithNull } from '../src/lib/write-payload';

test('omitUndefined: drops undefined, keeps falsy/empty/null values', () => {
    const out = omitUndefined({
        name: 'Ada',
        email: undefined,
        payRate: 0,
        hasContract: false,
        sin: '',
        notes: null as null,
    });
    assert.deepEqual(out, { name: 'Ada', payRate: 0, hasContract: false, sin: '', notes: null });
    assert.equal('email' in out, false);
});

test('omitUndefined: a blank worker form payload survives (regression: addDoc crash)', () => {
    // Exactly what WorkerFormDialog produces for a minimal Add Worker:
    // blank optional fields arrive as explicit undefined and used to make
    // addDoc throw "Unsupported field value: undefined".
    const payload = {
        name: 'Jane Doe',
        email: undefined,
        employeeNumber: undefined,
        hireDate: undefined,
        startDate: undefined,
        notes: undefined,
        payRate: 25,
    };
    const out = omitUndefined(payload);
    assert.deepEqual(Object.keys(out).sort(), ['name', 'payRate']);
});

test('replaceUndefinedWithNull: cleared fields become null (valid Firestore), others untouched', () => {
    const out = replaceUndefinedWithNull({ email: undefined, rate: 10, ok: false });
    assert.deepEqual(out, { email: null, rate: 10, ok: false });
});
