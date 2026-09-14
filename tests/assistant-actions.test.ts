import assert from 'node:assert/strict';
import test from 'node:test';

import {
    parseAssistantClientAction,
    parseAssistantMessageAction,
    resolveAssistantCapabilityAction,
} from '../src/ai/assistant-actions';

test('resolves allowlisted capability destinations into dispatch actions', () => {
    assert.deepEqual(resolveAssistantCapabilityAction({
        type: 'open_destination',
        destination: 'new_contact',
    }, []), {
        type: 'dispatch',
        target: '/contacts?action=new',
        isExternal: false,
        label: 'New Contact',
        category: 'Relationships',
    });

    const hubAction = resolveAssistantCapabilityAction({ type: 'open_destination', destination: 'contacts_hub' }, []);
    assert.equal(hubAction?.type, 'dispatch');
    assert.equal(hubAction?.type === 'dispatch' ? hubAction.label : undefined, 'Contacts Hub');
});

test('rejects capability actions that supply their own destination', () => {
    assert.equal(resolveAssistantCapabilityAction({
        type: 'open_destination',
        destination: '/accounting/payroll/run',
    }, []), undefined);
    assert.equal(resolveAssistantCapabilityAction({
        type: 'dispatch',
        target: 'https://attacker.example.com',
        isExternal: true,
        label: 'Contacts Hub',
    }, []), undefined);
    assert.equal(resolveAssistantCapabilityAction({
        type: 'open_destination',
        destination: 'new_contact',
        target: '/evil',
    }, []), undefined);
});

test('still applies tenant folder validation to prepared contact forms', () => {
    assert.equal(resolveAssistantCapabilityAction({
        type: 'open_contact_form',
        draft: { name: 'Ada Lovelace', folderId: 'other-tenant-folder' },
    }, ['clients']), undefined);

    assert.equal(resolveAssistantCapabilityAction({
        type: 'open_contact_form',
        draft: { name: 'Ada Lovelace', folderId: 'clients' },
    }, ['clients'])?.type, 'open_contact_form');
});

test('accepts safe internal and external dispatch targets', () => {
    assert.deepEqual(parseAssistantMessageAction({
        type: 'dispatch',
        target: '/accounting/ledgers?tab=income',
        isExternal: false,
        label: 'Income Ledger',
        category: 'Finances',
    }), {
        type: 'dispatch',
        target: '/accounting/ledgers?tab=income',
        isExternal: false,
        label: 'Income Ledger',
        category: 'Finances',
    });

    assert.deepEqual(parseAssistantMessageAction({
        type: 'dispatch',
        target: 'https://example.com/help',
        isExternal: true,
        label: 'Help',
    }), {
        type: 'dispatch',
        target: 'https://example.com/help',
        isExternal: true,
        label: 'Help',
    });
});

test('rejects unsafe or mismatched dispatch targets', () => {
    assert.equal(parseAssistantMessageAction({
        type: 'dispatch',
        target: 'javascript:alert(1)',
        isExternal: true,
        label: 'Unsafe',
    }), undefined);
    assert.equal(parseAssistantMessageAction({
        type: 'dispatch',
        target: '//example.com',
        isExternal: false,
        label: 'Unsafe',
    }), undefined);
    assert.equal(parseAssistantMessageAction({
        type: 'dispatch',
        target: '/contacts',
        isExternal: true,
        label: 'Contacts',
    }), undefined);
});

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