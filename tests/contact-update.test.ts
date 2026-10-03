import assert from 'node:assert/strict';
import test from 'node:test';

import {
    buildContactUpdatePayload,
    contactValuesEqual,
    isBlankRequiredContactField,
} from '../src/lib/contact-update';

const seeded = {
    name: 'Porky Pig',
    folderId: 'friends-id',
    email: '',
    cellPhone: '555-0100',
    payRate: 0,
    workerType: null,
};

test('saves only the field that was edited and leaves everything else out', () => {
    const { changes, blocked } = buildContactUpdatePayload({
        baseline: seeded,
        values: { ...seeded, email: 'porky@example.com' },
        editedKeys: new Set(['email']),
    });
    assert.deepEqual(changes, { email: 'porky@example.com' });
    assert.deepEqual(blocked, []);
});

test('ignores fields that differ without having been edited', () => {
    const { changes } = buildContactUpdatePayload({
        baseline: seeded,
        values: { ...seeded, folderId: '', cellPhone: '', workerType: 'employee' },
        editedKeys: new Set(['email']),
    });
    assert.deepEqual(changes, {});
});

test('blocks a blank required field even when it was edited', () => {
    const { changes, blocked } = buildContactUpdatePayload({
        baseline: seeded,
        values: { ...seeded, folderId: '', email: 'porky@example.com' },
        editedKeys: new Set(['folderId', 'email']),
    });
    assert.deepEqual(changes, { email: 'porky@example.com' });
    assert.deepEqual(blocked, ['folderId']);
});

test('allows an optional field to be cleared only when it was edited', () => {
    const { changes } = buildContactUpdatePayload({
        baseline: seeded,
        values: { ...seeded, cellPhone: '' },
        editedKeys: new Set(['cellPhone']),
    });
    assert.deepEqual(changes, { cellPhone: '' });
});

test('skips an edited field that ended up equal to its stored value', () => {
    const { changes } = buildContactUpdatePayload({
        baseline: seeded,
        values: { ...seeded, cellPhone: ' 555-0100 ' },
        editedKeys: new Set(['cellPhone']),
    });
    assert.deepEqual(changes, {});
});

test('treats missing, null and empty values as equal and compares dates by day', () => {
    assert.equal(contactValuesEqual(undefined, ''), true);
    assert.equal(contactValuesEqual(null, ''), true);
    assert.equal(contactValuesEqual(new Date('2026-03-04T10:00:00Z'), '2026-03-04'), true);
    assert.equal(contactValuesEqual('a', 'b'), false);
});

test('only name and folderId are protected from blanking', () => {
    assert.equal(isBlankRequiredContactField('folderId', ''), true);
    assert.equal(isBlankRequiredContactField('name', '  '), true);
    assert.equal(isBlankRequiredContactField('email', ''), false);
});
