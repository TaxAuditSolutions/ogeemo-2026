"use strict";
/**
 * Pure helpers for the Ogeemo backup Cloud Functions.
 *
 * Deliberately free of firebase-admin imports and side effects so these
 * helpers can be unit-tested directly from the repo test suite
 * (tests/functions-backup-utils.test.ts).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTH_EXPORT_FOLDER_PREFIX = exports.DATABASE_EXPORT_FOLDER_PREFIX = exports.AUTH_EXPORT_COLUMNS = void 0;
exports.isFullExportAuthorized = isFullExportAuthorized;
exports.isAuthExportAuthorized = isAuthExportAuthorized;
exports.authExportScope = authExportScope;
exports.filterUsersForExport = filterUsersForExport;
exports.escapeCsvValue = escapeCsvValue;
exports.buildAuthExportCsv = buildAuthExportCsv;
exports.backupTimestamp = backupTimestamp;
exports.authExportObjectName = authExportObjectName;
exports.firestoreExportPrefix = firestoreExportPrefix;
exports.messageFromError = messageFromError;
exports.groupDatabaseExportFiles = groupDatabaseExportFiles;
exports.backupPrefixFromObjectName = backupPrefixFromObjectName;
exports.formatBytes = formatBytes;
exports.isAllowedBackupObjectPath = isAllowedBackupObjectPath;
exports.authExportFileMatchesOrg = authExportFileMatchesOrg;
exports.isRestorablePrefix = isRestorablePrefix;
/** CSV header for the auth directory export (spreadsheet-friendly). */
exports.AUTH_EXPORT_COLUMNS = [
    'uid',
    'email',
    'email_verified',
    'display_name',
    'disabled',
    'created_at',
    'last_sign_in_at',
    'access_level',
    'org_id',
];
/**
 * Full-database exports contain every workspace's data, so they are limited
 * to platform administrators (super_admin) and the master tenant.
 */
function isFullExportAuthorized(claims) {
    if (!claims)
        return false;
    return claims.isMasterTenant === true || claims.accessLevel === 'super_admin';
}
/** Org admins may export their own workspace's auth directory. */
function isAuthExportAuthorized(claims) {
    if (!claims)
        return false;
    if (claims.isMasterTenant === true)
        return true;
    return (claims.accessLevel === 'super_admin' ||
        (claims.accessLevel === 'org_admin' && typeof claims.orgId === 'string' && claims.orgId.length > 0));
}
/** "all" for platform admins, "org" for workspace admins (their orgId only). */
function authExportScope(claims) {
    if (isFullExportAuthorized(claims))
        return 'all';
    return 'org';
}
/** Filters users for the requested export scope. Org scope only includes users carrying the orgId claim. */
function filterUsersForExport(users, scope, orgId) {
    if (scope === 'all')
        return users;
    if (!orgId)
        return [];
    return users.filter((user) => user.orgId === orgId);
}
/** Escapes a single CSV field (RFC 4180 quoting). */
function escapeCsvValue(value) {
    if (value === undefined || value === null)
        return '';
    const text = String(value);
    if (/[",\r\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}
/** Builds the auth directory CSV (header + one row per user). */
function buildAuthExportCsv(users) {
    const lines = [exports.AUTH_EXPORT_COLUMNS.join(',')];
    for (const user of users) {
        lines.push([
            escapeCsvValue(user.uid),
            escapeCsvValue(user.email),
            escapeCsvValue(user.emailVerified ? 'true' : 'false'),
            escapeCsvValue(user.displayName),
            escapeCsvValue(user.disabled ? 'true' : 'false'),
            escapeCsvValue(user.createdAt),
            escapeCsvValue(user.lastSignInAt),
            escapeCsvValue(user.accessLevel),
            escapeCsvValue(user.orgId),
        ].join(','));
    }
    // Trailing newline so plain-text tools see a complete file.
    return `${lines.join('\n')}\n`;
}
/** Filesystem/URI-safe timestamp, e.g. 2026-10-18T14-05-09-123Z. */
function backupTimestamp(at = new Date()) {
    return at.toISOString().replace(/[:.]/g, '-');
}
/** Object path for an auth directory export inside the backups bucket. */
function authExportObjectName(scope, orgId, at = new Date()) {
    const stamp = backupTimestamp(at);
    const scopePart = scope === 'all' ? 'users' : `users-${orgId !== null && orgId !== void 0 ? orgId : 'unknown-org'}`;
    return `auth-exports/${scopePart}-${stamp}.csv`;
}
/** Folder prefix (inside the backups bucket) for a Firestore database export. */
function firestoreExportPrefix(at = new Date()) {
    return `firestore-exports/${backupTimestamp(at)}/`;
}
/** Maps a raw callable error into a safe message (never leaks internals to the UI). */
function messageFromError(error, fallback) {
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        const message = error.message;
        if (message.trim().length > 0)
            return message;
    }
    return fallback;
}
exports.DATABASE_EXPORT_FOLDER_PREFIX = 'firestore-exports/';
exports.AUTH_EXPORT_FOLDER_PREFIX = 'auth-exports/';
/** Groups bucket objects into database backups keyed by their export folder. */
function groupDatabaseExportFiles(files) {
    var _a;
    const byPrefix = new Map();
    for (const file of files) {
        const prefix = backupPrefixFromObjectName(file.path);
        if (!prefix)
            continue;
        const list = (_a = byPrefix.get(prefix)) !== null && _a !== void 0 ? _a : [];
        list.push(file);
        byPrefix.set(prefix, list);
    }
    const summaries = [];
    for (const [prefix, prefixFiles] of byPrefix) {
        const totalSize = prefixFiles.reduce((sum, file) => sum + (Number.isFinite(file.size) ? file.size : 0), 0);
        const updatedAt = prefixFiles.reduce((latest, file) => {
            if (!file.updated)
                return latest;
            return !latest || file.updated > latest ? file.updated : latest;
        }, null);
        summaries.push({
            prefix,
            fileCount: prefixFiles.length,
            totalSize,
            updatedAt,
            files: [...prefixFiles].sort((a, b) => a.path.localeCompare(b.path)),
        });
    }
    // Newest first.
    return summaries.sort((a, b) => { var _a, _b; return ((_a = b.updatedAt) !== null && _a !== void 0 ? _a : '').localeCompare((_b = a.updatedAt) !== null && _b !== void 0 ? _b : ''); });
}
/** Extracts the export folder from an object path (firestore-exports/<stamp>/...). */
function backupPrefixFromObjectName(name) {
    const match = new RegExp(`^${exports.DATABASE_EXPORT_FOLDER_PREFIX}([^/]+)/`).exec(name !== null && name !== void 0 ? name : '');
    return match ? `${exports.DATABASE_EXPORT_FOLDER_PREFIX}${match[1]}/` : null;
}
/** Human-readable file size (0 B / 3.4 KB / 1.2 MB). */
function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0)
        return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
    }
    return `${unit === 0 ? value : value.toFixed(1)} ${units[unit]}`;
}
/** True when an object path may be downloaded (must live inside the backup folders). */
function isAllowedBackupObjectPath(path) {
    if (typeof path !== 'string' || path.length === 0)
        return false;
    if (path.includes('..') || path.startsWith('/') || /[\u0000-\u001f]/.test(path))
        return false;
    return path.startsWith(exports.DATABASE_EXPORT_FOLDER_PREFIX) || path.startsWith(exports.AUTH_EXPORT_FOLDER_PREFIX);
}
/** True when an auth export CSV belongs to a given workspace. */
function authExportFileMatchesOrg(path, orgId) {
    if (!path || !orgId)
        return false;
    return path.startsWith(`${exports.AUTH_EXPORT_FOLDER_PREFIX}users-${orgId}-`);
}
/** True for a well-formed, restorable gs:// prefix inside this project's backups bucket. */
function isRestorablePrefix(prefix, bucketName) {
    if (typeof prefix !== 'string')
        return false;
    const pattern = new RegExp(`^gs://${bucketName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/${exports.DATABASE_EXPORT_FOLDER_PREFIX}[A-Za-z0-9-]+/$`);
    return pattern.test(prefix);
}
//# sourceMappingURL=backup-utils.js.map