'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    LoaderCircle,
    CheckCircle,
    XCircle,
    Clock,
    ExternalLink,
    ShieldCheck,
    HardDrive,
    RotateCcw,
    FileDown,
    Download,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
    startFirestoreBackup,
    startAuthBackup,
    getBackupStatus,
    listBackups,
    restoreFirestoreBackup,
    getDownloadUrl,
    type ListBackupsResult,
} from '@/services/backup-service';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import firebaseConfig from '@/lib/config';
import {
    backupBucketName,
    formatBackupDate,
    formatBackupError,
    formatBytes,
    shortObjectPath,
    storageConsoleUrl,
} from '@/lib/backup-utils';

type TaskStatus = 'idle' | 'running' | 'success' | 'error' | 'pending';
interface TaskState {
    status: TaskStatus;
    message: string;
    /** gs:// URI of the output, rendered as a link when present. */
    uri?: string;
}

const POLL_INTERVAL_MS = 3000;
/** ~2 minutes of polling for large database jobs before giving up politely. */
const MAX_POLLS = 40;
const RESTORE_CONFIRM_WORD = 'RESTORE';

/**
 * Backup & Portability: three clearly separated actions - Back up, Restore and
 * Export - all backed by server-side Cloud Functions writing to the project's
 * backups bucket (gs://<project>-backups/).
 */
export function BackupManagerView() {
    // Backup list (shared by the Backup and Restore cards).
    const [backups, setBackups] = useState<ListBackupsResult | null>(null);
    const [listError, setListError] = useState<string | null>(null);
    const [isLoadingList, setIsLoadingList] = useState(true);

    // Backup card.
    const [backupTask, setBackupTask] = useState<TaskState>({ status: 'idle', message: '' });
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [expandedBackup, setExpandedBackup] = useState<string | null>(null);
    const [downloadingPath, setDownloadingPath] = useState<string | null>(null);

    // Restore card.
    const [restoreTarget, setRestoreTarget] = useState('');
    const [restoreConfirmText, setRestoreConfirmText] = useState('');
    const [restoreTask, setRestoreTask] = useState<TaskState>({ status: 'idle', message: '' });
    const [isRestoring, setIsRestoring] = useState(false);

    // Export card.
    const [isExportingDirectory, setIsExportingDirectory] = useState(false);

    const { toast } = useToast();
    const bucketName = backupBucketName(firebaseConfig.projectId);
    const databaseBackups = backups?.databaseBackups ?? [];

    const refreshBackups = useCallback(async () => {
        try {
            const result = await listBackups();
            setBackups(result);
            setListError(null);
        } catch (error) {
            setListError(formatBackupError(error));
        } finally {
            setIsLoadingList(false);
        }
    }, []);

    useEffect(() => {
        refreshBackups();
    }, [refreshBackups]);
    /** Polls a running database job (backup or restore) until it settles. */
    const pollOperation = async (operationName: string, runningMessage: string, doneMessage: string): Promise<TaskState> => {
        for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
            await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
            try {
                const status = await getBackupStatus(operationName);
                if (status.status === 'completed') {
                    return { status: 'success', message: doneMessage, uri: status.outputUriPrefix ?? undefined };
                }
                if (status.status === 'failed') {
                    return { status: 'error', message: status.message || 'The operation failed.' };
                }
            } catch {
                // Transient polling error - keep trying until the attempt budget runs out.
            }
        }
        return { status: 'pending', message: `${runningMessage} is still processing in the cloud - refresh this page in a few minutes.` };
    };

    const handleBackUpNow = async () => {
        setIsBackingUp(true);
        setBackupTask({ status: 'running', message: 'Starting the backup...' });
        try {
            const result = await startFirestoreBackup();
            if (result.status === 'completed') {
                setBackupTask({
                    status: 'success',
                    message: 'Backup completed. Your files are in the backups bucket.',
                    uri: result.outputUriPrefix,
                });
                toast({ title: 'Backup completed', description: 'Your database backup is ready.' });
            } else {
                const task = await pollOperation(
                    result.operationName,
                    'The backup',
                    'Backup completed. Your files are in the backups bucket.'
                );
                setBackupTask({ ...task, uri: task.uri ?? result.outputUriPrefix });
                if (task.status === 'success') {
                    toast({ title: 'Backup completed', description: task.message });
                } else if (task.status === 'error') {
                    toast({ variant: 'destructive', title: 'Backup failed', description: task.message });
                } else {
                    toast({ title: 'Backup is processing', description: task.message });
                }
            }
        } catch (error) {
            const message = formatBackupError(error);
            setBackupTask({ status: 'error', message });
            toast({ variant: 'destructive', title: 'Backup could not start', description: message });
        } finally {
            setIsBackingUp(false);
            refreshBackups();
        }
    };

    const handleRestore = async () => {
        if (!restoreTarget || restoreConfirmText !== RESTORE_CONFIRM_WORD) return;
        setIsRestoring(true);
        setRestoreTask({ status: 'running', message: 'Restoring from the selected backup...' });
        try {
            const result = await restoreFirestoreBackup(restoreTarget);
            if (result.status === 'completed') {
                setRestoreTask({ status: 'success', message: result.message });
                toast({ title: 'Restore completed', description: result.message });
            } else {
                const task = await pollOperation(
                    result.operationName,
                    'The restore',
                    'Restore completed. Your database now contains the data from that backup.'
                );
                setRestoreTask(task);
                if (task.status === 'success') {
                    toast({ title: 'Restore completed', description: task.message });
                } else if (task.status === 'error') {
                    toast({ variant: 'destructive', title: 'Restore failed', description: task.message });
                } else {
                    toast({ title: 'Restore is processing', description: task.message });
                }
            }
        } catch (error) {
            const message = formatBackupError(error);
            setRestoreTask({ status: 'error', message });
            toast({ variant: 'destructive', title: 'Restore could not start', description: message });
        } finally {
            setIsRestoring(false);
            setRestoreConfirmText('');
        }
    };

    /** Fetches a short-lived signed URL and triggers a browser download. */
    const downloadObject = async (objectPath: string) => {
        const { url } = await getDownloadUrl(objectPath);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.rel = 'noopener noreferrer';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
    };

    const handleDownloadFile = async (objectPath: string) => {
        setDownloadingPath(objectPath);
        try {
            await downloadObject(objectPath);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Download failed', description: formatBackupError(error) });
        } finally {
            setDownloadingPath(null);
        }
    };

    const handleExportDirectory = async () => {
        setIsExportingDirectory(true);
        try {
            const result = await startAuthBackup();
            const objectPath = result.destination.replace(`gs://${bucketName}/`, '');
            await downloadObject(objectPath);
            toast({ title: 'Member directory ready', description: result.message });
            refreshBackups();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Export failed', description: formatBackupError(error) });
        } finally {
            setIsExportingDirectory(false);
        }
    };
    const StatusIndicator = ({ task }: { task: TaskState }) => {
        switch (task.status) {
            case 'running':
                return <LoaderCircle className="h-4 w-4 text-blue-500 animate-spin" />;
            case 'success':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'pending':
                return <Clock className="h-4 w-4 text-amber-500" />;
            case 'error':
                return <XCircle className="h-4 w-4 text-destructive" />;
            default:
                return null;
        }
    };

    /** Inline status block: icon + message, with a bucket link when output exists. */
    const TaskBlock = ({ task }: { task: TaskState }) => (
        <div className="p-3 rounded-lg bg-muted space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
                <StatusIndicator task={task} />
                <span>{task.message}</span>
            </div>
            {task.uri && (
                <a
                    href={storageConsoleUrl(bucketName, task.uri)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline break-all"
                >
                    <ExternalLink className="h-3 w-3 shrink-0" /> {task.uri}
                </a>
            )}
        </div>
    );

    return (
        <div className="p-4 sm:p-6 space-y-6 flex flex-col items-center">
            <header className="text-center">
                <h1 className="text-3xl font-bold font-headline text-primary uppercase tracking-tight">Backup &amp; Portability</h1>
                <p className="text-muted-foreground">Back up your data, restore from a backup, or export it for use anywhere.</p>
            </header>

            <div className="w-full max-w-2xl space-y-6">
                <Alert className="bg-primary/5 border-primary/20">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <AlertTitle>Data Portability Mandate</AlertTitle>
                    <AlertDescription className="text-xs space-y-2">
                        <p>Ogeemo operates on an <strong>"Ethical Exit"</strong> policy. You own your data - exports are free, server-side, and stored in your secure backups bucket.</p>
                        <p className="font-bold text-primary">Your data remains accessible and free to export even if your subscription is terminated.</p>
                    </AlertDescription>
                </Alert>

                {/* 1. BACK UP */}
                <Card className="shadow-lg border-primary/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <HardDrive className="h-5 w-5 text-primary" /> Backup
                        </CardTitle>
                        <CardDescription>
                            Create a point-in-time copy of your business database in Ogeemo's secure backups bucket
                            (<code>gs://{bucketName}/</code>).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button onClick={handleBackUpNow} disabled={isBackingUp} className="w-full h-12 text-base font-bold shadow-lg">
                            {isBackingUp ? (
                                <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <HardDrive className="mr-2 h-5 w-5" />
                            )}
                            {isBackingUp ? 'Backing up...' : 'Back up now'}
                        </Button>
                        {backupTask.status !== 'idle' && <TaskBlock task={backupTask} />}

                        <div className="pt-2 border-t">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Recent backups</h4>
                                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={refreshBackups} disabled={isLoadingList}>
                                    Refresh
                                </Button>
                            </div>
                            {isLoadingList && <p className="text-sm text-muted-foreground py-2">Loading backups...</p>}
                            {!isLoadingList && listError && (
                                <p className="text-sm text-destructive py-2">{listError}</p>
                            )}
                            {!isLoadingList && !listError && databaseBackups.length === 0 && (
                                <p className="text-sm text-muted-foreground py-2">
                                    No backups yet. Press <strong>Back up now</strong> to create your first one.
                                </p>
                            )}
                            {!isLoadingList && !listError && databaseBackups.length > 0 && (
                                <ul className="divide-y">
                                    {databaseBackups.map((backup) => {
                                        const isExpanded = expandedBackup === backup.prefix;
                                        return (
                                            <li key={backup.prefix} className="py-3 space-y-2">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium">{formatBackupDate(backup.updatedAt)}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {backup.fileCount} file{backup.fileCount === 1 ? '' : 's'} &middot; {formatBytes(backup.totalSize)}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2 shrink-0">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 text-xs"
                                                            onClick={() => setExpandedBackup(isExpanded ? null : backup.prefix)}
                                                        >
                                                            {isExpanded ? <ChevronDown className="h-3.5 w-3.5 mr-1" /> : <ChevronRight className="h-3.5 w-3.5 mr-1" />}
                                                            Files
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 text-xs"
                                                            onClick={() => {
                                                                setRestoreTarget(backup.prefix);
                                                                setRestoreConfirmText('');
                                                                setRestoreTask({ status: 'idle', message: '' });
                                                                document.getElementById('restore-target')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                            }}
                                                        >
                                                            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restore this
                                                        </Button>
                                                    </div>
                                                </div>
                                                {isExpanded && (
                                                    <ul className="pl-3 space-y-1 max-h-56 overflow-y-auto border-l-2 border-muted">
                                                        {backup.files.map((file) => (
                                                            <li key={file.path} className="flex items-center justify-between gap-2 text-xs">
                                                                <span className="truncate font-mono" title={file.path}>
                                                                    {shortObjectPath(backup.prefix, file.path)}
                                                                </span>
                                                                <span className="flex items-center gap-2 text-muted-foreground shrink-0">
                                                                    {formatBytes(file.size)}
                                                                    <button
                                                                        type="button"
                                                                        aria-label={`Download ${shortObjectPath(backup.prefix, file.path)}`}
                                                                        className="p-1 rounded hover:bg-muted text-primary disabled:opacity-50"
                                                                        disabled={downloadingPath === file.path}
                                                                        onClick={() => handleDownloadFile(file.path)}
                                                                    >
                                                                        {downloadingPath === file.path ? (
                                                                            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                                                                        ) : (
                                                                            <Download className="h-3.5 w-3.5" />
                                                                        )}
                                                                    </button>
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* 2. RESTORE */}
                <Card className="shadow-lg border-destructive/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <RotateCcw className="h-5 w-5 text-destructive" /> Restore
                        </CardTitle>
                        <CardDescription>
                            Recover your business database from one of the backups listed above.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert className="border-destructive/50 bg-destructive/5">
                            <XCircle className="h-4 w-4 text-destructive" />
                            <AlertTitle>Restoring overwrites matching records</AlertTitle>
                            <AlertDescription className="text-xs">
                                Records that exist in the backup replace the current versions with the same IDs.
                                Records created after the backup are <strong>not</strong> deleted. Take a fresh backup first if you are unsure.
                            </AlertDescription>
                        </Alert>
                        <div className="space-y-2">
                            <Label htmlFor="restore-target">Backup to restore</Label>
                            <select
                                id="restore-target"
                                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                value={restoreTarget}
                                onChange={(event) => setRestoreTarget(event.target.value)}
                                disabled={isRestoring || databaseBackups.length === 0}
                            >
                                <option value="">
                                    {databaseBackups.length === 0 ? 'No backups available' : 'Choose a backup...'}
                                </option>
                                {databaseBackups.map((backup) => (
                                    <option key={backup.prefix} value={backup.prefix}>
                                        {formatBackupDate(backup.updatedAt)} - {backup.fileCount} files ({formatBytes(backup.totalSize)})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="restore-confirm">Type {RESTORE_CONFIRM_WORD} to confirm</Label>
                            <Input
                                id="restore-confirm"
                                value={restoreConfirmText}
                                onChange={(event) => setRestoreConfirmText(event.target.value)}
                                placeholder={RESTORE_CONFIRM_WORD}
                                autoComplete="off"
                                disabled={isRestoring}
                            />
                        </div>
                        <Button
                            variant="destructive"
                            className="w-full"
                            disabled={isRestoring || !restoreTarget || restoreConfirmText !== RESTORE_CONFIRM_WORD}
                            onClick={handleRestore}
                        >
                            {isRestoring ? <LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> : <RotateCcw className="mr-2 h-5 w-5" />}
                            {isRestoring ? 'Restoring...' : 'Restore backup'}
                        </Button>
                        {restoreTask.status !== 'idle' && <TaskBlock task={restoreTask} />}
                        <p className="text-xs text-muted-foreground">
                            Restores bring back business records only. Member accounts and passwords are never included in
                            exports - members sign in as usual after a restore.
                        </p>
                    </CardContent>
                </Card>

                {/* 3. EXPORT */}
                <Card className="shadow-lg border-primary/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileDown className="h-5 w-5 text-primary" /> Export
                        </CardTitle>
                        <CardDescription>
                            Take your data with you in portable formats - no cloud console or special tools needed.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border">
                            <div className="min-w-0">
                                <p className="text-sm font-semibold">Member directory (CSV)</p>
                                <p className="text-xs text-muted-foreground">
                                    Emails, names, roles and workspace - opens in Excel, Google Sheets, HR and CRM tools.
                                </p>
                            </div>
                            <Button size="sm" onClick={handleExportDirectory} disabled={isExportingDirectory} className="shrink-0">
                                {isExportingDirectory ? (
                                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Download className="mr-2 h-4 w-4" />
                                )}
                                {isExportingDirectory ? 'Preparing...' : 'Download'}
                            </Button>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border">
                            <div className="min-w-0">
                                <p className="text-sm font-semibold">Database backup files</p>
                                <p className="text-xs text-muted-foreground">
                                    Firestore's native export format - downloadable file by file from the Backup list above.
                                </p>
                            </div>
                            <Button size="sm" variant="outline" asChild className="shrink-0">
                                <a href={storageConsoleUrl(bucketName)} target="_blank" rel="noopener noreferrer">
                                    Open bucket <ExternalLink className="ml-2 h-3.5 w-3.5" />
                                </a>
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Database exports can be imported back into any Firestore project; the member directory CSV is
                            ready for spreadsheets and third-party tools.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}






