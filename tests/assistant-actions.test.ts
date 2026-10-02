import assert from 'node:assert/strict';
import test from 'node:test';

import {
    buildDeterministicContactDraft,
    getContactFormSession,
    isContactFormOpenInHistory,
    parseAssistantClientAction,
    parseAssistantMessageAction,
    reconcileContactDraftAction,
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

    assert.deepEqual(resolveAssistantCapabilityAction({ type: 'submit_contact_form' }, []), {
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

    // Supports hierarchical folder names like "Workers / Employees"
    assert.deepEqual(resolveAssistantCapabilityActionWithRepair({
        type: 'update_contact_draft',
        patch: { folderId: 'Workers / Employees' },
    }, [
        { id: 'workers-id', name: 'Workers' },
        { id: 'emp-id', name: 'Employees' },
    ]), {
        type: 'update_contact_draft',
        patch: { folderId: 'emp-id' },
    });

    // Supports flattened payloads where folderId is at the top level
    assert.deepEqual(resolveAssistantCapabilityActionWithRepair({
        type: 'update_contact_draft',
        folderId: 'Prospects',
    }, [
        { id: 'prospects-id', name: 'Prospects' },
    ]), {
        type: 'update_contact_draft',
        patch: { folderId: 'prospects-id' },
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

const reconcileFolders = [
    { id: 'friends-id', name: 'Friends' },
    { id: 'clients-id', name: 'Clients' },
];
const formOpenedHistory = [
    { role: 'user', content: 'create it for me' },
    { role: 'model', content: 'Opened.', action: { type: 'dispatch', target: '/contacts?action=new', isExternal: false, label: 'New Contact' } },
];

test('detects whether the contact form is open from the thread actions', () => {
    assert.equal(isContactFormOpenInHistory([]), false);
    assert.equal(isContactFormOpenInHistory(formOpenedHistory), true);
    assert.equal(isContactFormOpenInHistory([
        ...formOpenedHistory,
        { role: 'model', content: 'Done.', action: { type: 'update_contact_draft', patch: { name: 'Porky Pig' } } },
    ]), true);
    assert.equal(isContactFormOpenInHistory([
        ...formOpenedHistory,
        { role: 'model', content: 'Submitting.', action: { type: 'submit_contact_form' } },
    ]), false);
});

test('sends the name the reply claims even when the model returned no action', () => {
    assert.deepEqual(reconcileContactDraftAction({
        action: undefined,
        snapshot: { name: 'Porky Pig', folderId: '', email: '' },
        history: formOpenedHistory,
        folders: reconcileFolders,
    }), { type: 'update_contact_draft', patch: { name: 'Porky Pig' } });
});

test('re-sends every known field when the model only patches the folder', () => {
    assert.deepEqual(reconcileContactDraftAction({
        action: { type: 'update_contact_draft', patch: { folderId: 'Friends' } },
        snapshot: { name: 'Porky Pig', folderId: 'Friends' },
        history: formOpenedHistory,
        folders: reconcileFolders,
    }), { type: 'update_contact_draft', patch: { name: 'Porky Pig', folderId: 'friends-id' } });
});

test('attaches the snapshot to a submit so the form is complete before saving', () => {
    assert.deepEqual(reconcileContactDraftAction({
        action: { type: 'submit_contact_form' },
        snapshot: { name: 'Porky Pig', folderId: 'friends-id' },
        history: formOpenedHistory,
        folders: reconcileFolders,
    }), { type: 'submit_contact_form', patch: { name: 'Porky Pig', folderId: 'friends-id' } });
});

test('directly submits new contact with full snapshot when folder is chosen', () => {
    assert.deepEqual(reconcileContactDraftAction({
        action: { type: 'submit_contact_form' },
        snapshot: { name: 'Porky Pig', folderId: 'Friends' },
        history: formOpenedHistory,
        folders: reconcileFolders,
    }), { type: 'submit_contact_form', patch: { name: 'Porky Pig', folderId: 'friends-id' } });
});

test('leaves other actions and closed-form turns untouched', () => {
    const open = { type: 'open_destination', destination: 'new_contact' };
    assert.equal(reconcileContactDraftAction({
        action: open,
        snapshot: { name: 'Porky Pig' },
        history: formOpenedHistory,
        folders: reconcileFolders,
    }), open);

    assert.equal(reconcileContactDraftAction({
        action: undefined,
        snapshot: { name: 'Porky Pig' },
        history: [{ role: 'user', content: 'create a contact called Porky Pig' }],
        folders: reconcileFolders,
    }), undefined);

    assert.equal(reconcileContactDraftAction({
        action: undefined,
        snapshot: { name: '', folderId: 'Nowhere', email: 'not-an-email' },
        history: formOpenedHistory,
        folders: reconcileFolders,
    }), undefined);
});

test('accepts and persists a submit action that carries a final patch', () => {
    const action = { type: 'submit_contact_form', patch: { name: 'Porky Pig', folderId: 'clients' } };
    assert.deepEqual(parseAssistantClientAction(action, ['clients']), action);
    assert.equal(parseAssistantClientAction(action, ['other']), undefined);
    assert.deepEqual(parseAssistantMessageAction(JSON.parse(JSON.stringify(action))), action);
});

const editHistory = [
    { role: 'user', content: 'add an email to Porky Pig' },
    { role: 'model', content: 'Opened.', action: { type: 'open_contact', contactId: 'porky-id' } },
];
const catalog = [{ id: 'porky-id', name: 'Porky Pig', email: '', folderId: 'friends-id' }];

test('identifies an edit session and the record it opened', () => {
    assert.deepEqual(getContactFormSession(editHistory), { mode: 'edit', contactId: 'porky-id' });
    assert.deepEqual(getContactFormSession(formOpenedHistory), { mode: 'create' });
    assert.equal(getContactFormSession([]), null);
});

test('an edit sends only the requested change, not the unchanged name and folder', () => {
    assert.deepEqual(reconcileContactDraftAction({
        action: undefined,
        snapshot: { name: 'Porky Pig', folderId: 'Friends', email: 'porky@example.com' },
        history: editHistory,
        folders: reconcileFolders,
        contacts: catalog,
        userMessage: 'porky@example.com',
    }), { type: 'update_contact_draft', patch: { email: 'porky@example.com' } });
});

test('an edit cannot move or rename a contact unless the user asked for it', () => {
    assert.equal(reconcileContactDraftAction({
        action: undefined,
        snapshot: { folderId: 'Clients', name: 'Porky Pug' },
        history: editHistory,
        folders: reconcileFolders,
        contacts: catalog,
        userMessage: 'yes',
    }), undefined);

    assert.deepEqual(reconcileContactDraftAction({
        action: undefined,
        snapshot: { folderId: 'Clients' },
        history: editHistory,
        folders: reconcileFolders,
        contacts: catalog,
        userMessage: 'move Porky Pig to the Clients folder',
    }), { type: 'update_contact_draft', patch: { folderId: 'clients-id' } });
});

test('an edit submit carries only real changes and a no-change submit stays plain', () => {
    assert.deepEqual(reconcileContactDraftAction({
        action: { type: 'submit_contact_form' },
        snapshot: { email: 'porky@example.com', folderId: 'Friends' },
        history: editHistory,
        folders: reconcileFolders,
        contacts: catalog,
        userMessage: 'yes',
    }), { type: 'submit_contact_form', patch: { email: 'porky@example.com' } });

    assert.deepEqual(reconcileContactDraftAction({
        action: { type: 'submit_contact_form' },
        snapshot: { name: 'Porky Pig', folderId: 'friends-id' },
        history: editHistory,
        folders: reconcileFolders,
        contacts: catalog,
        userMessage: 'yes',
    }), { type: 'submit_contact_form' });
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