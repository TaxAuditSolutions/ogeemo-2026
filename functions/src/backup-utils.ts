/**
 * Pure helpers for the Ogeemo backup Cloud Functions.
 *
 * Deliberately free of firebase-admin imports and side effects so these
 * helpers can be unit-tested directly from the repo test suite
 * (tests/functions-backup-utils.test.ts).
 */

/** Minimal shape of a user record needed for the auth directory export. */
export interface AuthExportUser {
  uid: string;
  email?: string;
  displayName?: string;
  disabled?: boolean;
  emailVerified?: boolean;
  /** ISO-8601 timestamps ("" when unknown). */
  createdAt?: string;
  lastSignInAt?: string;
  accessLevel?: string;
  orgId?: string;
}

/** CSV header for the auth directory export (spreadsheet-friendly). */
export const AUTH_EXPORT_COLUMNS = [
  'uid',
  'email',
  'email_verified',
  'display_name',
  'disabled',
  'created_at',
  'last_sign_in_at',
  'access_level',
  'org_id',
] as const;

/** Claims carried by the caller of a callable function. */
export interface CallerClaims {
  accessLevel?: unknown;
  isMasterTenant?: unknown;
  orgId?: unknown;
}

/**
 * Full-database exports contain every workspace's data, so they are limited
 * to platform administrators (super_admin) and the master tenant.
 */
export function isFullExportAuthorized(claims: CallerClaims | undefined | null): boolean {
  if (!claims) return false;
  return claims.isMasterTenant === true || claims.accessLevel === 'super_admin';
}

/** Org admins may export their own workspace's auth directory. */
export function isAuthExportAuthorized(claims: CallerClaims | undefined | null): boolean {
  if (!claims) return false;
  if (claims.isMasterTenant === true) return true;
  return (
    claims.accessLevel === 'super_admin' ||
    (claims.accessLevel === 'org_admin' && typeof claims.orgId === 'string' && claims.orgId.length > 0)
  );
}

/** "all" for platform admins, "org" for workspace admins (their orgId only). */
export function authExportScope(claims: CallerClaims | undefined | null): 'all' | 'org' {
  if (isFullExportAuthorized(claims)) return 'all';
  return 'org';
}

/** Filters users for the requested export scope. Org scope only includes users carrying the orgId claim. */
export function filterUsersForExport(
  users: AuthExportUser[],
  scope: 'all' | 'org',
  orgId: string | undefined | null
): AuthExportUser[] {
  if (scope === 'all') return users;
  if (!orgId) return [];
  return users.filter((user) => user.orgId === orgId);
}

/** Escapes a single CSV field (RFC 4180 quoting). */
export function escapeCsvValue(value: string | number | boolean | undefined | null): string {
  if (value === undefined || value === null) return '';
  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** Builds the auth directory CSV (header + one row per user). */
export function buildAuthExportCsv(users: AuthExportUser[]): string {
  const lines: string[] = [AUTH_EXPORT_COLUMNS.join(',')];
  for (const user of users) {
    lines.push(
      [
        escapeCsvValue(user.uid),
        escapeCsvValue(user.email),
        escapeCsvValue(user.emailVerified ? 'true' : 'false'),
        escapeCsvValue(user.displayName),
        escapeCsvValue(user.disabled ? 'true' : 'false'),
        escapeCsvValue(user.createdAt),
        escapeCsvValue(user.lastSignInAt),
        escapeCsvValue(user.accessLevel),
        escapeCsvValue(user.orgId),
      ].join(',')
    );
  }
  // Trailing newline so plain-text tools see a complete file.
  return `${lines.join('\n')}\n`;
}

/** Filesystem/URI-safe timestamp, e.g. 2026-10-18T14-05-09-123Z. */
export function backupTimestamp(at: Date = new Date()): string {
  return at.toISOString().replace(/[:.]/g, '-');
}

/** Object path for an auth directory export inside the backups bucket. */
export function authExportObjectName(scope: 'all' | 'org', orgId: string | null | undefined, at: Date = new Date()): string {
  const stamp = backupTimestamp(at);
  const scopePart = scope === 'all' ? 'users' : `users-${orgId ?? 'unknown-org'}`;
  return `auth-exports/${scopePart}-${stamp}.csv`;
}

/** Folder prefix (inside the backups bucket) for a Firestore database export. */
export function firestoreExportPrefix(at: Date = new Date()): string {
  return `firestore-exports/${backupTimestamp(at)}/`;
}

/** Maps a raw callable error into a safe message (never leaks internals to the UI). */
export function messageFromError(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string') {
    const message = (error as { message: string }).message;
    if (message.trim().length > 0) return message;
  }
  return fallback;
}

/** One object stored in the backups bucket. */
export interface BackupFileInput {
  path: string;
  size: number;
  updated: string | null;
}

/** A database export folder (firestore-exports/<timestamp>/) with its files. */
export interface DatabaseBackupSummary {
  prefix: string;
  fileCount: number;
  totalSize: number;
  updatedAt: string | null;
  files: BackupFileInput[];
}

/** One member-directory CSV in the bucket. */
export interface AuthExportSummary {
  path: string;
  size: number;
  updatedAt: string | null;
}

export const DATABASE_EXPORT_FOLDER_PREFIX = 'firestore-exports/';
export const AUTH_EXPORT_FOLDER_PREFIX = 'auth-exports/';

/** Groups bucket objects into database backups keyed by their export folder. */
export function groupDatabaseExportFiles(files: BackupFileInput[]): DatabaseBackupSummary[] {
  const byPrefix = new Map<string, BackupFileInput[]>();
  for (const file of files) {
    const prefix = backupPrefixFromObjectName(file.path);
    if (!prefix) continue;
    const list = byPrefix.get(prefix) ?? [];
    list.push(file);
    byPrefix.set(prefix, list);
  }
  const summaries: DatabaseBackupSummary[] = [];
  for (const [prefix, prefixFiles] of byPrefix) {
    const totalSize = prefixFiles.reduce((sum, file) => sum + (Number.isFinite(file.size) ? file.size : 0), 0);
    const updatedAt = prefixFiles.reduce<string | null>((latest, file) => {
      if (!file.updated) return latest;
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
  return summaries.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
}

/** Extracts the export folder from an object path (firestore-exports/<stamp>/...). */
export function backupPrefixFromObjectName(name: string): string | null {
  const match = new RegExp(`^${DATABASE_EXPORT_FOLDER_PREFIX}([^/]+)/`).exec(name ?? '');
  return match ? `${DATABASE_EXPORT_FOLDER_PREFIX}${match[1]}/` : null;
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

/** True when an object path may be downloaded (must live inside the backup folders). */
export function isAllowedBackupObjectPath(path: string): boolean {
  if (typeof path !== 'string' || path.length === 0) return false;
  if (path.includes('..') || path.startsWith('/') || /[\u0000-\u001f]/.test(path)) return false;
  return path.startsWith(DATABASE_EXPORT_FOLDER_PREFIX) || path.startsWith(AUTH_EXPORT_FOLDER_PREFIX);
}

/** True when an auth export CSV belongs to a given workspace. */
export function authExportFileMatchesOrg(path: string, orgId: string): boolean {
  if (!path || !orgId) return false;
  return path.startsWith(`${AUTH_EXPORT_FOLDER_PREFIX}users-${orgId}-`);
}

/** True for a well-formed, restorable gs:// prefix inside this project's backups bucket. */
export function isRestorablePrefix(prefix: string, bucketName: string): boolean {
  if (typeof prefix !== 'string') return false;
  const pattern = new RegExp(`^gs://${bucketName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/${DATABASE_EXPORT_FOLDER_PREFIX}[A-Za-z0-9-]+/$`);
  return pattern.test(prefix);
}

