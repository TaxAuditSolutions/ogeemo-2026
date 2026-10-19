import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    AUTH_EXPORT_COLUMNS,
    authExportObjectName,
    authExportScope,
    authExportFileMatchesOrg,
    backupPrefixFromObjectName,
    backupTimestamp,
    buildAuthExportCsv,
    escapeCsvValue,
    filterUsersForExport,
    firestoreExportPrefix,
    formatBytes,
    groupDatabaseExportFiles,
    isAllowedBackupObjectPath,
    isAuthExportAuthorized,
    isFullExportAuthorized,
    isRestorablePrefix,
    messageFromError,
} from '../functions/src/backup-utils';

test('full-database export is limited to platform admins and the master tenant', () => {
    assert.equal(isFullExportAuthorized({ accessLevel: 'super_admin' }), true);
    assert.equal(isFullExportAuthorized({ isMasterTenant: true }), true);
    assert.equal(isFullExportAuthorized({ accessLevel: 'org_admin', orgId: 'org-1' }), false);
    assert.equal(isFullExportAuthorized({ accessLevel: 'editor', orgId: 'org-1' }), false);
    assert.equal(isFullExportAuthorized(undefined), false);
    assert.equal(isFullExportAuthorized(null), false);
});

test('auth export allows platform admins (full) and org admins (own workspace only)', () => {
    assert.equal(isAuthExportAuthorized({ accessLevel: 'super_admin' }), true);
    assert.equal(isAuthExportAuthorized({ isMasterTenant: true }), true);
    assert.equal(isAuthExportAuthorized({ accessLevel: 'org_admin', orgId: 'org-1' }), true);
    assert.equal(isAuthExportAuthorized({ accessLevel: 'org_admin' }), false);
    assert.equal(isAuthExportAuthorized({ accessLevel: 'viewer', orgId: 'org-1' }), false);
    assert.equal(authExportScope({ accessLevel: 'super_admin' }), 'all');
    assert.equal(authExportScope({ isMasterTenant: true }), 'all');
    assert.equal(authExportScope({ accessLevel: 'org_admin', orgId: 'org-1' }), 'org');
});

test('org scope only keeps users carrying the same orgId claim', () => {
    const users = [
        { uid: '1', orgId: 'org-1' },
        { uid: '2', orgId: 'org-2' },
        { uid: '3' },
    ];
    assert.deepEqual(filterUsersForExport(users, 'org', 'org-1').map((user) => user.uid), ['1']);
    assert.deepEqual(filterUsersForExport(users, 'org', null), []);
    assert.equal(filterUsersForExport(users, 'all', null).length, 3);
});

test('CSV escaping quotes commas, quotes and newlines (RFC 4180)', () => {
    assert.equal(escapeCsvValue('plain'), 'plain');
    assert.equal(escapeCsvValue('a,b'), '"a,b"');
    assert.equal(escapeCsvValue('say "hi"'), '"say ""hi"""');
    assert.equal(escapeCsvValue('line1\nline2'), '"line1\nline2"');
    assert.equal(escapeCsvValue(undefined), '');
    assert.equal(escapeCsvValue(null), '');
});

test('auth export CSV has the documented header and one row per user', () => {
    const csv = buildAuthExportCsv([
        {
            uid: 'u1',
            email: 'a@example.com',
            emailVerified: true,
            displayName: 'Ann, "Q"',
            accessLevel: 'org_admin',
            orgId: 'org-1',
        },
        { uid: 'u2', email: 'b@example.com', disabled: true },
    ]);
    const lines = csv.trim().split('\n');
    assert.equal(lines[0], AUTH_EXPORT_COLUMNS.join(','));
    assert.equal(lines.length, 3);
    assert.ok(lines[1].includes('"Ann, ""Q"""'));
    assert.ok(lines[2].startsWith('u2,b@example.com,false,,true'));
});

test('backup paths use filesystem-safe timestamps', () => {
    const at = new Date('2026-10-18T12:34:56.789Z');
    assert.equal(backupTimestamp(at), '2026-10-18T12-34-56-789Z');
    assert.equal(firestoreExportPrefix(at), 'firestore-exports/2026-10-18T12-34-56-789Z/');
    assert.equal(authExportObjectName('all', null, at), 'auth-exports/users-2026-10-18T12-34-56-789Z.csv');
    assert.equal(authExportObjectName('org', 'org-1', at), 'auth-exports/users-org-1-2026-10-18T12-34-56-789Z.csv');
});

test('messageFromError always returns readable text', () => {
    assert.equal(messageFromError(new Error('boom'), 'fallback'), 'boom');
    assert.equal(messageFromError({}, 'fallback'), 'fallback');
    assert.equal(messageFromError('nope', 'fallback'), 'fallback');
    assert.equal(messageFromError(undefined, 'fallback'), 'fallback');
});

test('backupPrefixFromObjectName extracts export folders and rejects strays', () => {
    assert.equal(
        backupPrefixFromObjectName('firestore-exports/2026-10-18T12-00-00-000Z/all_namespaces/output-0'),
        'firestore-exports/2026-10-18T12-00-00-000Z/'
    );
    assert.equal(backupPrefixFromObjectName('auth-exports/users-1.csv'), null);
    assert.equal(backupPrefixFromObjectName('other/file.txt'), null);
    assert.equal(backupPrefixFromObjectName(''), null);
});

test('groupDatabaseExportFiles groups, totals and sorts newest first', () => {
    const files = [
        { path: 'firestore-exports/run-b/output-1', size: 100, updated: '2026-10-18T10:00:00Z' },
        { path: 'firestore-exports/run-a/output-0', size: 50, updated: '2026-10-18T09:00:00Z' },
        { path: 'firestore-exports/run-a/export_metadata', size: 25, updated: '2026-10-18T09:05:00Z' },
        { path: 'auth-exports/users.csv', size: 999, updated: '2026-10-18T11:00:00Z' },
        { path: 'stray.txt', size: 1, updated: null },
    ];
    const grouped = groupDatabaseExportFiles(files);
    assert.equal(grouped.length, 2);
    assert.equal(grouped[0].prefix, 'firestore-exports/run-b/');
    assert.equal(grouped[0].fileCount, 1);
    assert.equal(grouped[0].totalSize, 100);
    assert.equal(grouped[1].prefix, 'firestore-exports/run-a/');
    assert.equal(grouped[1].fileCount, 2);
    assert.equal(grouped[1].totalSize, 75);
    assert.equal(grouped[1].updatedAt, '2026-10-18T09:05:00Z');
    assert.equal(grouped[1].files[0].path, 'firestore-exports/run-a/export_metadata');
});

test('formatBytes renders human-readable sizes', () => {
    assert.equal(formatBytes(0), '0 B');
    assert.equal(formatBytes(-5), '0 B');
    assert.equal(formatBytes(Number.NaN), '0 B');
    assert.equal(formatBytes(512), '512 B');
    assert.equal(formatBytes(1024), '1.0 KB');
    assert.equal(formatBytes(124002644), '118.3 MB');
});

test('isAllowedBackupObjectPath only allows files inside the backup folders', () => {
    assert.equal(isAllowedBackupObjectPath('firestore-exports/2026-run/output-0'), true);
    assert.equal(isAllowedBackupObjectPath('auth-exports/users-1.csv'), true);
    assert.equal(isAllowedBackupObjectPath('../secret.txt'), false);
    assert.equal(isAllowedBackupObjectPath('/etc/passwd'), false);
    assert.equal(isAllowedBackupObjectPath('firestore-exports/../../x'), false);
    assert.equal(isAllowedBackupObjectPath(''), false);
    assert.equal(isAllowedBackupObjectPath('other-folder/file.txt'), false);
});

test('authExportFileMatchesOrg matches only that workspace', () => {
    assert.equal(authExportFileMatchesOrg('auth-exports/users-org-1-2026.csv', 'org-1'), true);
    assert.equal(authExportFileMatchesOrg('auth-exports/users-org-2-2026.csv', 'org-1'), false);
    assert.equal(authExportFileMatchesOrg('auth-exports/users-2026.csv', 'org-1'), false);
    assert.equal(authExportFileMatchesOrg('auth-exports/users-org-1-2026.csv', ''), false);
});

test('isRestorablePrefix accepts only this bucket\'s export folders', () => {
    const bucket = 'ogeemo-firebase-backups';
    assert.equal(isRestorablePrefix('gs://ogeemo-firebase-backups/firestore-exports/2026-10-18T12-00-00-000Z/', bucket), true);
    assert.equal(isRestorablePrefix('gs://evil-bucket/firestore-exports/2026-10-18T12-00-00-000Z/', bucket), false);
    assert.equal(isRestorablePrefix('gs://ogeemo-firebase-backups/firestore-exports/../../', bucket), false);
    assert.equal(isRestorablePrefix('gs://ogeemo-firebase-backups/auth-exports/users-1.csv', bucket), false);
    assert.equal(isRestorablePrefix('firestore-exports/2026-10-18T12-00-00-000Z/', bucket), false);
});

