
'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseServices } from '@/firebase';
import type { BackupScopeLabel } from '@/lib/backup-utils';

async function getFunctionsService() {
    const { functions } = getFirebaseServices();
    return functions;
}

export interface FirestoreBackupResult {
    message: string;
    outputUriPrefix: string;
    operationName: string;
    scopeLabel?: BackupScopeLabel;
    status: 'completed' | 'running';
}

export interface BackupStatusResult {
    status: 'running' | 'completed' | 'failed';
    state: string | null;
    outputUriPrefix: string | null;
    message: string;
}

export interface AuthBackupResult {
    message: string;
    destination: string;
    userCount: number;
    scope: 'all' | 'org';
}

/** Starts a Firestore export (full database or scoped collection group set) into the backups bucket. */
export async function startFirestoreBackup(scopeLabel: BackupScopeLabel = 'full-database'): Promise<FirestoreBackupResult> {
    const functions = await getFunctionsService();
    const triggerFirestoreBackup = httpsCallable<{ scopeLabel: BackupScopeLabel }, FirestoreBackupResult>(functions, 'triggerFirestoreBackup');

    const result = await triggerFirestoreBackup({ scopeLabel });
    return result.data;
}

/** Polls the status of a Firestore export operation. */
export async function getBackupStatus(operationName: string): Promise<BackupStatusResult> {
    const functions = await getFunctionsService();
    const callable = httpsCallable<{ operationName: string }, BackupStatusResult>(functions, 'getBackupStatus');

    const result = await callable({ operationName });
    return result.data;
}

/** Exports the member directory (auth users) to a CSV in the backups bucket. */
export async function startAuthBackup(): Promise<AuthBackupResult> {
    const functions = await getFunctionsService();
    const triggerAuthBackup = httpsCallable<void, AuthBackupResult>(functions, 'triggerAuthBackup');

    const result = await triggerAuthBackup();
    return result.data;
}

export interface DatabaseBackupSummary {
    prefix: string;
    scopeLabel?: string;
    fileCount: number;
    totalSize: number;
    updatedAt: string | null;
    files: Array<{ path: string; size: number; updated: string | null }>;
}

export interface AuthExportSummary {
    path: string;
    size: number;
    updatedAt: string | null;
}

export interface ListBackupsResult {
    databaseBackups: DatabaseBackupSummary[];
    authExports: AuthExportSummary[];
    scope: 'full' | 'org';
}

export interface RestoreResult {
    message: string;
    operationName: string;
    status: 'completed' | 'running';
}

export interface DownloadUrlResult {
    url: string;
    expiresInSeconds: number;
}

/** Lists stored database backups and member-directory exports. */
export async function listBackups(): Promise<ListBackupsResult> {
    const functions = await getFunctionsService();
    const callable = httpsCallable<void, ListBackupsResult>(functions, 'listBackups');

    const result = await callable();
    return result.data;
}

/** Restores the database from a stored backup folder (requires confirmation). */
export async function restoreFirestoreBackup(prefix: string): Promise<RestoreResult> {
    const functions = await getFunctionsService();
    const callable = httpsCallable<{ prefix: string; confirm: true }, RestoreResult>(functions, 'restoreFirestoreBackup');

    const result = await callable({ prefix, confirm: true });
    return result.data;
}

/** Returns a short-lived signed download URL for a file in the backups bucket. */
export async function getDownloadUrl(objectPath: string): Promise<DownloadUrlResult> {
    const functions = await getFunctionsService();
    const callable = httpsCallable<{ objectPath: string }, DownloadUrlResult>(functions, 'getDownloadUrl');

    const result = await callable({ objectPath });
    return result.data;
}

