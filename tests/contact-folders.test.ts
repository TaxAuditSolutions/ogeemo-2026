import assert from 'node:assert/strict';
import test from 'node:test';

import {
    DEFAULT_CONTACT_FOLDER_NAME,
    findMatchingContactFolder,
    resolveContactFolderId,
    resolveDefaultContactFolderId,
} from '../src/lib/contact-folders';

test('prefers the system Miscellaneous folder over the alphabetically first folder', () => {
    // getFolders() sorts by name, so folders[0] would be "Admin" here.
    const folders = [
        { id: 'admin', name: 'Admin', isSystem: true },
        { id: 'clients', name: 'Clients', isSystem: true },
        { id: 'misc', name: 'Miscellaneous', isSystem: true },
    ];

    assert.equal(resolveDefaultContactFolderId(folders), 'misc');
    assert.equal(DEFAULT_CONTACT_FOLDER_NAME, 'Miscellaneous');
});

test('prefers the system Miscellaneous folder over a user folder with the same name', () => {
    const folders = [
        { id: 'user-misc', name: 'Miscellaneous' },
        { id: 'system-misc', name: 'Miscellaneous', isSystem: true },
    ];

    assert.equal(resolveDefaultContactFolderId(folders), 'system-misc');
});

test('matches the Miscellaneous folder name case-insensitively and ignores padding', () => {
    const folders = [
        { id: 'admin', name: 'Admin', isSystem: true },
        { id: 'misc', name: '  miscellaneous  ' },
    ];

    assert.equal(resolveDefaultContactFolderId(folders), 'misc');
});

test('falls back to the first folder when no Miscellaneous folder exists', () => {
    const folders = [
        { id: 'admin', name: 'Admin', isSystem: true },
        { id: 'family', name: 'Family', isSystem: true },
    ];

    assert.equal(resolveDefaultContactFolderId(folders), 'admin');
});

test('returns undefined when the tenant has no folders', () => {
    assert.equal(resolveDefaultContactFolderId([]), undefined);
});

test('findMatchingContactFolder matches by id, case-insensitive name, and path segments', () => {
    const folders = [
        { id: 'fld_1', name: 'Friends' },
        { id: 'fld_2', name: 'Employees' },
        { id: 'fld_3', name: 'Clients' },
    ];

    assert.equal(findMatchingContactFolder('fld_1', folders)?.id, 'fld_1');
    assert.equal(findMatchingContactFolder('friends', folders)?.id, 'fld_1');
    assert.equal(findMatchingContactFolder('  FRIENDS  ', folders)?.id, 'fld_1');
    assert.equal(findMatchingContactFolder('Workers / Employees', folders)?.id, 'fld_2');
    assert.equal(findMatchingContactFolder('unknown', folders), undefined);
    assert.equal(findMatchingContactFolder('', folders), undefined);
    assert.equal(findMatchingContactFolder(undefined, folders), undefined);
});

test('resolveContactFolderId resolves names to IDs or preserves the reference', () => {
    const folders = [
        { id: 'fld_friends', name: 'Friends' },
    ];

    assert.equal(resolveContactFolderId('Friends', folders), 'fld_friends');
    assert.equal(resolveContactFolderId('fld_friends', folders), 'fld_friends');
    assert.equal(resolveContactFolderId('custom_id', folders), 'custom_id');
    assert.equal(resolveContactFolderId('Friends', []), 'Friends');
    assert.equal(resolveContactFolderId('', folders), undefined);
});
