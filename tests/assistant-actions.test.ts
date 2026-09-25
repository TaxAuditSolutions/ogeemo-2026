import assert from 'node:assert/strict';
import test from 'node:test';

import {
    buildDeterministicContactDraft,
    parseAssistantClientAction,
    parseAssistantMessageAction,
    resolveAssistantCapabilityAction,
    resolveAssistantCapabilityActionWithRepair,
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

test('accepts opening an existing contact with an initial patch', () => {
    const action = parseAssistantClientAction({
        type: 'open_contact',
        contactId: 'contact-123',
        patch: { cellPhone: '555-0199' },
    }, ['clients']);

    assert.deepEqual(action, {
        type: 'open_contact',
        contactId: 'contact-123',
        patch: { cellPhone: '555-0199' },
    });
});

test('rejects an open_contact patch whose folder is not in the active tenant catalog', () => {
    const action = parseAssistantClientAction({
        type: 'open_contact',
        contactId: 'contact-123',
        patch: { folderId: 'other-tenant-folder' },
    }, ['clients']);

    assert.equal(action, undefined);
});

test('accepts incremental contact draft patches and submit actions', () => {
    assert.deepEqual(parseAssistantClientAction({
        type: 'update_contact_draft',
        patch: { name: 'Ada Lovelace' },
    }, ['clients']), {
        type: 'update_contact_draft',
        patch: { name: 'Ada Lovelace' },
    });

    assert.deepEqual(parseAssistantClientAction({
        type: 'update_contact_draft',
        patch: { folderId: 'clients' },
    }, ['clients']), {
        type: 'update_contact_draft',
        patch: { folderId: 'clients' },
    });

    assert.deepEqual(parseAssistantClientAction({ type: 'submit_contact_form' }, []), {
        type: 'submit_contact_form',
    });
});

test('rejects unsafe or empty incremental contact draft patches', () => {
    assert.equal(parseAssistantClientAction({
        type: 'update_contact_draft',
        patch: { folderId: 'other-tenant-folder' },
    }, ['clients']), undefined);

    assert.equal(parseAssistantClientAction({
        type: 'update_contact_draft',
        patch: { orgId: 'another-tenant' },
    }, ['clients']), undefined);

    assert.equal(parseAssistantClientAction({
        type: 'update_contact_draft',
        patch: {},
    }, ['clients']), undefined);
});

test('round-trips workflow actions through persisted JSON', () => {
    const actions = [
        { type: 'update_contact_draft', patch: { name: 'Jane Doe', folderId: 'clients' } },
        { type: 'submit_contact_form' },
    ];

    for (const action of actions) {
        const restored = JSON.parse(JSON.stringify(action));
        assert.deepEqual(parseAssistantMessageAction(restored), action);
    }
});

test('repairs a contact patch folder name to its tenant folder ID', () => {
    assert.deepEqual(resolveAssistantCapabilityActionWithRepair({
        type: 'update_contact_draft',
        patch: { folderId: 'Clients' },
    }, [
        { id: 'clients-id', name: 'Clients' },
        { id: 'vendors-id', name: 'Vendors' },
    ]), {
        type: 'update_contact_draft',
        patch: { folderId: 'clients-id' },
    });

    assert.equal(resolveAssistantCapabilityActionWithRepair({
        type: 'update_contact_draft',
        patch: { folderId: 'Unknown' },
    }, [{ id: 'clients-id', name: 'Clients' }]), undefined);
});

test('repairs an unmatched contact form folder into Miscellaneous', () => {
    const folders = [
        { id: 'admin-id', name: 'Admin', isSystem: true },
        { id: 'misc-id', name: 'Miscellaneous', isSystem: true },
    ];

    assert.deepEqual(resolveAssistantCapabilityActionWithRepair({
        type: 'open_contact_form',
        draft: { name: 'Ada Lovelace', folderId: 'Unknown' },
    }, folders), {
        type: 'open_contact_form',
        draft: { name: 'Ada Lovelace', folderId: 'misc-id' },
    });
});

test('drops an unresolvable folder id from an open_contact patch instead of rejecting the whole action', () => {
    const folders = [{ id: 'clients-id', name: 'Clients' }];

    assert.deepEqual(resolveAssistantCapabilityActionWithRepair({
        type: 'open_contact',
        contactId: 'contact-123',
        patch: { cellPhone: '555-0199', folderId: 'Unknown' },
    }, folders), {
        type: 'open_contact',
        contactId: 'contact-123',
        patch: { cellPhone: '555-0199' },
    });
});

test('builds a deterministic contact draft from a full contact request sentence', () => {
    const action = buildDeterministicContactDraft(
        'Make a contact for Nick Illiopoulos email address of nick@ogeemo.com',
        [{ id: 'clients', name: 'Clients' }],
    );

    assert.deepEqual(action, {
        type: 'open_contact_form',
        draft: {
            name: 'Nick Illiopoulos',
            folderId: 'clients',
            email: 'nick@ogeemo.com',
        },
    });
});

test('omits the email when the request sentence has none', () => {
    const action = buildDeterministicContactDraft(
        'Add a contact named Dana White',
        [{ id: 'clients', name: 'Clients' }],
    );

    assert.deepEqual(action, {
        type: 'open_contact_form',
        draft: {
            name: 'Dana White',
            folderId: 'clients',
        },
    });
});

test('returns no draft when no contact name can be extracted', () => {
    const folders = [{ id: 'clients', name: 'Clients' }];

    assert.equal(buildDeterministicContactDraft('What is Ogeemo?', folders), undefined);
    assert.equal(buildDeterministicContactDraft('Add nick@ogeemo.com as a contact', folders), undefined);
    assert.equal(buildDeterministicContactDraft('Make a contact for me', folders), undefined);
    assert.equal(buildDeterministicContactDraft('', folders), undefined);
});

test('falls back to the first tenant folder when the tenant has no Miscellaneous folder', () => {
    const folders = [
        { id: 'clients', name: 'Clients' },
        { id: 'vendors', name: 'Vendors' },
    ];

    const defaultAction = buildDeterministicContactDraft('Create a contact for Bob Example', folders);
    assert.equal(defaultAction?.type === 'open_contact_form' ? defaultAction.draft.folderId : undefined, 'clients');

    const vendorAction = buildDeterministicContactDraft('Create a contact for Bob Example in Vendors folder', folders);
    assert.deepEqual(vendorAction, {
        type: 'open_contact_form',
        draft: { name: 'Bob Example', folderId: 'vendors' },
    });

    assert.equal(buildDeterministicContactDraft('Create a contact for Bob Example', []), undefined);
});

test('files a deterministic draft with no folder mention into Miscellaneous', () => {
    const folders = [
        { id: 'admin-id', name: 'Admin', isSystem: true },
        { id: 'misc-id', name: 'Miscellaneous', isSystem: true },
    ];

    assert.deepEqual(buildDeterministicContactDraft('Create a contact for Bob Example', folders), {
        type: 'open_contact_form',
        draft: { name: 'Bob Example', folderId: 'misc-id' },
    });
});

test('extracts phone numbers into draft fields and keeps the name clean', () => {
    const action = buildDeterministicContactDraft(
        'create a contact for Sam Sneed, cell #4166666797',
        [{ id: 'clients', name: 'Clients' }],
    );

    assert.deepEqual(action, {
        type: 'open_contact_form',
        draft: {
            name: 'Sam Sneed',
            folderId: 'clients',
            cellPhone: '4166666797',
            primaryPhoneType: 'cellPhone',
        },
    });
});

test('handles folder-first phrasing with the name in a follow-up fragment', () => {
    const action = buildDeterministicContactDraft(
        'create a new contact in the friends folder.  John Test with email address John@gmail.com',
        [
            { id: 'misc', name: 'Miscellaneous' },
            { id: 'friends', name: 'Friends' },
        ],
    );

    assert.deepEqual(action, {
        type: 'open_contact_form',
        draft: { name: 'John Test', folderId: 'friends', email: 'John@gmail.com' },
    });
});

test('maps labelled phones to their draft fields alongside an email', () => {
    const action = buildDeterministicContactDraft(
        'Add a contact named Dana White, email dana@example.com, work 416-555-0123',
        [{ id: 'clients', name: 'Clients' }],
    );

    assert.deepEqual(action, {
        type: 'open_contact_form',
        draft: {
            name: 'Dana White',
            folderId: 'clients',
            email: 'dana@example.com',
            businessPhone: '416-555-0123',
            primaryPhoneType: 'businessPhone',
        },
    });
});