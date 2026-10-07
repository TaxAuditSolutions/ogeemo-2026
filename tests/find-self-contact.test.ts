import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findSelfContact } from '../src/lib/self-contact';

const me = { uid: 'u-dan', email: 'dan@firm.ca' };

test('findSelfContact: a worker stamped with my uid does not become my identity', () => {
    // Regression: Brian (added by Dan, so userId = Dan's uid) sorted first
    // and was labelled "(Admin)" in the Time Log Report.
    const contacts = [
        { id: 'brian', userId: 'u-dan', email: 'brian@client.ca', name: 'Brian Manzer' },
        { id: 'dan', userId: 'u-dan', email: 'dan@firm.ca', name: 'Dan White' },
    ];
    assert.equal(findSelfContact(contacts, me)?.id, 'dan');
});

test('findSelfContact: returns undefined when only wrong-email candidates exist', () => {
    const contacts = [{ id: 'brian', userId: 'u-dan', email: 'brian@client.ca' }];
    assert.equal(findSelfContact(contacts, me), undefined);
});

test('findSelfContact: falls back to the uid match when the account has no email', () => {
    const contacts = [{ id: 'self', userId: 'u-dan', email: null }];
    assert.equal(findSelfContact(contacts, { uid: 'u-dan', email: null })?.id, 'self');
});

test('findSelfContact: no user, no uid, or no candidates -> undefined', () => {
    assert.equal(findSelfContact([], me), undefined);
    assert.equal(findSelfContact([{ id: 'x', userId: 'other' }], me), undefined);
    assert.equal(findSelfContact([{ id: 'x', userId: 'u-dan' }], null), undefined);
});
