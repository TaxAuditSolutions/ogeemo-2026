import assert from 'node:assert/strict';
import test from 'node:test';

import { parseAssistantClientAction } from '../src/ai/assistant-actions';

test('accepts an allowlisted contact draft in a valid tenant folder', () => {
    const action = parseAssistantClientAction({
        type: 'open_contact_form',
        draft: {
            name: 'Ada Lovelace',
            folderId: 'clients',
            email: 'ada@example.com',
            businessName: 'Analytical Engines Ltd.',
        },
    }, ['clients']);

    assert.deepEqual(action, {
        type: 'open_contact_form',
        draft: {
            name: 'Ada Lovelace',
            folderId: 'clients',
            email: 'ada@example.com',
            businessName: 'Analytical Engines Ltd.',
        },
    });
});

test('rejects drafts containing server-owned or unknown fields', () => {
    const action = parseAssistantClientAction({
        type: 'open_contact_form',
        draft: {
            name: 'Ada Lovelace',
            folderId: 'clients',
            orgId: 'another-tenant',
        },
    }, ['clients']);

    assert.equal(action, undefined);
});

test('rejects a draft whose folder is not in the active tenant catalog', () => {
    const action = parseAssistantClientAction({
        type: 'open_contact_form',
        draft: {
            name: 'Ada Lovelace',
            folderId: 'other-tenant-folder',
        },
    }, ['clients']);

    assert.equal(action, undefined);
});

test('accepts opening an existing contact without requiring a folder', () => {
    const action = parseAssistantClientAction({
        type: 'open_contact',
        contactId: 'contact-123',
    }, []);

    assert.deepEqual(action, { type: 'open_contact', contactId: 'contact-123' });
});