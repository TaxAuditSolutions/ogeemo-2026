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

export type BackupScopeLabel =
    | 'full-database'
    | 'employees'
    | 'projects'
    | 'crm-contacts'
    | 'finance'
    | 'documents-notes';

export interface BackupScopeOption {
    value: BackupScopeLabel;
    title: string;
    description: string;
    collectionIds: readonly string[] | null;
}

export const BACKUP_SCOPE_OPTIONS: readonly BackupScopeOption[] = [
    {
        value: 'full-database',
        title: 'Full database',
        description: 'All namespaces and collection groups across the entire Firestore database.',
        collectionIds: null,
    },
    {
        value: 'employees',
        title: 'Employees & Payroll',
        description: 'Workers, payroll runs, remittances, leave requests, and time logs.',
        collectionIds: [
            'payrollWorkers',
            'payrollRuns',
            'details',
            'payrollRemittances',
            'leaveRequests',
            'timeLogs',
            'locations',
        ],
    },
    {
        value: 'projects',
        title: 'Projects & Operations',
        description: 'Projects, tasks, templates, work orders, service items, inventory, and suppliers.',
        collectionIds: [
            'projects',
            'tasks',
            'projectTemplates',
            'workOrders',
            'workOrderLineItems',
            'serviceItems',
            'inventoryItems',
            'inventoryLogs',
            'suppliers',
        ],
    },
    {
        value: 'crm-contacts',
        title: 'CRM & Contacts',
        description: 'Contacts, contact folders, leads, CRM actions, client accounts, companies, and industries.',
        collectionIds: [
            'contacts',
            'contactFolders',
            'leads',
            'crmActions',
            'clientAccounts',
            'companies',
            'industries',
        ],
    },
    {
        value: 'finance',
        title: 'Finance & Accounting',
        description: 'Invoices, quotes, income/expense transactions, bills, petty cash, assets, loans, and equity.',
        collectionIds: [
            'invoices',
            'invoiceLineItems',
            'quotes',
            'quoteLineItems',
            'incomeTransactions',
            'expenseTransactions',
            'payableBills',
            'receiptStagingQueue',
            'pettyCashTransactions',
            'assets',
            'loans',
            'equityTransactions',
            'expenseCategories',
            'incomeCategories',
            'internalAccounts',
            'taxTypes',
        ],
    },
    {
        value: 'documents-notes',
        title: 'Documents & Notes',
        description: 'Files, folders, note sessions, meetings, and ideas.',
        collectionIds: [
            'files',
            'fileManagerFolders',
            'userNoteSessions',
            'meetings',
            'ideas',
        ],
    },
] as const;

/** Formats a backup scope folder label (`employees`, `full-database`, etc.) into a human-readable heading. */
export function formatBackupScopeLabel(scopeLabel: string | undefined | null): string {
    const normalized = (scopeLabel ?? '').trim();
    if (!normalized) return 'Full database';
    const match = BACKUP_SCOPE_OPTIONS.find((opt) => opt.value === normalized);
    if (match) return match.title;
    return normalized
        .split('-')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

export interface BackupObjectDescription {
    label: string;
    description?: string;
}

/** Describes known Firestore-native export artifacts without changing their object paths. */
export function describeBackupObject(relativePath: string): BackupObjectDescription {
    const segments = relativePath.split('/');
    const fileName = segments[segments.length - 1] ?? '';
    const isFullCollectionExport = segments.includes('all_namespaces') && segments.includes('all_kinds');
    const kindSegment = segments.find((segment) => segment.startsWith('kind_'));
    const collectionId = kindSegment ? kindSegment.slice('kind_'.length) : null;

    if (fileName.endsWith('.overall_export_metadata')) {
        return {
            label: 'Full database export manifest',
            description: 'Import metadata for the complete database export.',
        };
    }

    if (fileName.endsWith('.export_metadata')) {
        if (collectionId) {
            return {
                label: `Collection metadata (${collectionId})`,
                description: `Metadata for the "${collectionId}" collection group.`,
            };
        }
        return {
            label: 'Collection-group metadata',
            description: isFullCollectionExport
                ? 'Metadata for all namespaces and collection groups.'
                : 'Firestore metadata for this export.',
        };
    }

    const shardMatch = /^output-(\d+)$/.exec(fileName);
    if (shardMatch) {
        const shardNumber = Number(shardMatch[1]);
        if (collectionId) {
            return {
                label: `${collectionId} — Data shard ${shardNumber}`,
                description: `Exported documents from the "${collectionId}" collection group.`,
            };
        }
        return {
            label: `Data shard ${shardNumber}`,
            ...(isFullCollectionExport
                ? { description: 'Part of the all-namespaces, all-collection-groups export; contents are not labeled by collection.' }
                : {}),
        };
    }

    return { label: relativePath };
}
