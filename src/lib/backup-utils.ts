/**
 * Pure helpers for the Backup & Portability screen.
 *
 * Kept free of React/Firebase imports so the logic can be unit-tested
 * directly (tests/backup-utils.test.ts).
 */

/** Snapshot of the most recent export run (persisted locally for the "Last export" line). */
export interface LastBackupRun {
    /** ISO-8601 timestamp. */
    at: string;
    type: 'firestore' | 'auth';
    /** gs:// URI of the export output. */
    uri: string;
}

/** Backup destination bucket name for a Firebase project (created in the Firestore region). */
export function backupBucketName(projectId: string): string {
    return `${projectId}-backups`;
}

/** gs:// URI of the backup destination bucket. */
export function backupBucketUri(projectId: string): string {
    return `gs://${backupBucketName(projectId)}/`;
}

/** Extracts the bucket name from a gs:// URI, or null when the URI is malformed. */
export function bucketNameFromUri(uri: string): string | null {
    const match = /^gs:\/\/([^/]+)(\/|$)/.exec((uri ?? '').trim());
    return match ? match[1] : null;
}

/** Google Cloud Storage console URL for a bucket (optionally a folder/object inside it). */
export function storageConsoleUrl(bucketName: string, uri?: string | null): string {
    const base = `https://console.cloud.google.com/storage/browser/${bucketName}`;
    if (!uri) return base;
    const objectPath = uri.replace(/^gs:\/\/[^/]+\//, '').replace(/\/+$/, '');
    return objectPath ? `${base}/${objectPath}` : base;
}

/** Turns any thrown value into a human-readable message (never "undefined"). */
export function formatBackupError(error: unknown): string {
    if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as { message?: unknown }).message;
        if (typeof message === 'string' && message.trim().length > 0) return message;
    }
    if (typeof error === 'string' && error.trim().length > 0) return error;
    return 'Something went wrong while preparing your export. Please try again.';
}

/** Parses a persisted "last export" record, returning null for anything malformed. */
export function parseLastBackupRun(raw: string | null): LastBackupRun | null {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as Partial<LastBackupRun> | null;
        if (
            parsed &&
            typeof parsed === 'object' &&
            typeof parsed.at === 'string' &&
            (parsed.type === 'firestore' || parsed.type === 'auth') &&
            typeof parsed.uri === 'string'
        ) {
            return { at: parsed.at, type: parsed.type, uri: parsed.uri };
        }
    } catch {
        // Malformed JSON - treat as "no record".
    }
    return null;
}

/** Human-readable file size (0 B / 3.4 KB / 1.2 MB). */
export function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
    }
    return `${unit === 0 ? value : value.toFixed(1)} ${units[unit]}`;
}

/** Localized date/time for a backup timestamp, with a readable fallback. */
export function formatBackupDate(iso: string | null | undefined): string {
    if (!iso) return 'Unknown date';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return 'Unknown date';
    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

/** Strips a bucket prefix from an object path for compact display. */
export function shortObjectPath(prefix: string, path: string): string {
    return path.startsWith(prefix) ? path.slice(prefix.length) || path : path;
}
