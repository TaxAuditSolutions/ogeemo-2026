import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    backupBucketName,
    backupBucketUri,
    bucketNameFromUri,
    describeBackupObject,
    formatBackupDate,
    formatBackupError,
    formatBackupScopeLabel,
    formatBytes,
    parseLastBackupRun,
    shortObjectPath,
    storageConsoleUrl,
} from '../src/lib/backup-utils';

test('backup bucket names derive from the Firebase project id', () => {
    assert.equal(backupBucketName('ogeemo-firebase'), 'ogeemo-firebase-backups');
    assert.equal(backupBucketUri('ogeemo-firebase'), 'gs://ogeemo-firebase-backups/');
});

test('gs:// URIs map to Cloud Storage console browser URLs', () => {
    assert.equal(
        storageConsoleUrl('ogeemo-firebase-backups'),
        'https://console.cloud.google.com/storage/browser/ogeemo-firebase-backups'
    );
    assert.equal(
        storageConsoleUrl('ogeemo-firebase-backups', 'gs://ogeemo-firebase-backups/firestore-exports/run-1/'),
        'https://console.cloud.google.com/storage/browser/ogeemo-firebase-backups/firestore-exports/run-1'
    );
    assert.equal(
        storageConsoleUrl('ogeemo-firebase-backups', 'gs://ogeemo-firebase-backups/auth-exports/users-1.csv'),
        'https://console.cloud.google.com/storage/browser/ogeemo-firebase-backups/auth-exports/users-1.csv'
    );
});

test('bucketNameFromUri parses buckets and rejects malformed URIs', () => {
    assert.equal(bucketNameFromUri('gs://ogeemo-firebase-backups/firestore-exports/x/'), 'ogeemo-firebase-backups');
    assert.equal(bucketNameFromUri('gs://ogeemo-firebase-backups'), 'ogeemo-firebase-backups');
    assert.equal(bucketNameFromUri('https://example.com'), null);
    assert.equal(bucketNameFromUri(''), null);
});

test('formatBackupError always returns readable text', () => {
    assert.equal(formatBackupError(new Error('functions/internal')), 'functions/internal');
    assert.equal(formatBackupError('plain string'), 'plain string');
    assert.equal(formatBackupError({}), 'Something went wrong while preparing your export. Please try again.');
    assert.equal(formatBackupError(undefined), 'Something went wrong while preparing your export. Please try again.');
    assert.equal(formatBackupError(new Error('   ')), 'Something went wrong while preparing your export. Please try again.');
});

test('parseLastBackupRun validates persisted records', () => {
    const valid = JSON.stringify({ at: '2026-10-18T12:00:00.000Z', type: 'firestore', uri: 'gs://b/x/' });
    assert.deepEqual(parseLastBackupRun(valid), { at: '2026-10-18T12:00:00.000Z', type: 'firestore', uri: 'gs://b/x/' });
    assert.equal(parseLastBackupRun(null), null);
    assert.equal(parseLastBackupRun('not json'), null);
    assert.equal(parseLastBackupRun(JSON.stringify({ at: '2026-10-18T12:00:00.000Z', type: 'nope', uri: 'gs://b/x/' })), null);
    assert.equal(parseLastBackupRun(JSON.stringify({ type: 'auth', uri: 'gs://b/x/' })), null);
});

test('formatBytes renders human-readable sizes for the backup list', () => {
    assert.equal(formatBytes(0), '0 B');
    assert.equal(formatBytes(Number.NaN), '0 B');
    assert.equal(formatBytes(750), '750 B');
    assert.equal(formatBytes(1024), '1.0 KB');
    assert.equal(formatBytes(124002644), '118.3 MB');
});

test('formatBackupDate always produces a usable label', () => {
    assert.equal(formatBackupDate(null), 'Unknown date');
    assert.equal(formatBackupDate(undefined), 'Unknown date');
    assert.equal(formatBackupDate('not-a-date'), 'Unknown date');
    const label = formatBackupDate('2026-10-18T12:00:00.000Z');
    assert.ok(label.includes('2026'), `expected a year in "${label}"`);
});

test('shortObjectPath strips the backup prefix for compact display', () => {
    assert.equal(
        shortObjectPath('firestore-exports/run-1/', 'firestore-exports/run-1/all_namespaces/output-0'),
        'all_namespaces/output-0'
    );
    assert.equal(shortObjectPath('firestore-exports/run-1/', 'firestore-exports/run-1/'), 'firestore-exports/run-1/');
    assert.equal(shortObjectPath('other/', 'unrelated/path.txt'), 'unrelated/path.txt');
});

test('describeBackupObject labels Firestore export metadata and data shards', () => {
    assert.deepEqual(
        describeBackupObject('2026-10-18T17-11-18-506Z.overall_export_metadata'),
        {
            label: 'Full database export manifest',
            description: 'Import metadata for the complete database export.',
        }
    );
    assert.deepEqual(
        describeBackupObject('all_namespaces/all_kinds/all_namespaces_all_kinds.export_metadata'),
        {
            label: 'Collection-group metadata',
            description: 'Metadata for all namespaces and collection groups.',
        }
    );
    assert.deepEqual(describeBackupObject('all_namespaces/all_kinds/output-13'), {
        label: 'Data shard 13',
        description: 'Part of the all-namespaces, all-collection-groups export; contents are not labeled by collection.',
    });
    assert.deepEqual(
        describeBackupObject('all_namespaces/kind_projects/all_namespaces_kind_projects.export_metadata'),
        {
            label: 'Collection metadata (projects)',
            description: 'Metadata for the "projects" collection group.',
        }
    );
    assert.deepEqual(describeBackupObject('all_namespaces/kind_projects/output-0'), {
        label: 'projects — Data shard 0',
        description: 'Exported documents from the "projects" collection group.',
    });
});

test('formatBackupScopeLabel renders friendly titles for configured and custom labels', () => {
    assert.equal(formatBackupScopeLabel('full-database'), 'Full database');
    assert.equal(formatBackupScopeLabel('employees'), 'Employees & Payroll');
    assert.equal(formatBackupScopeLabel('projects'), 'Projects & Operations');
    assert.equal(formatBackupScopeLabel('custom-scope'), 'Custom Scope');
    assert.equal(formatBackupScopeLabel(undefined), 'Full database');
});

test('describeBackupObject preserves unfamiliar paths as their display labels', () => {
    assert.deepEqual(describeBackupObject('future-format/custom-output.bin'), {
        label: 'future-format/custom-output.bin',
    });
});

