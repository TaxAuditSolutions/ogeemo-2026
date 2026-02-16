
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { LoaderCircle, Database, Users, CheckCircle, XCircle, Info, ExternalLink, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { startFirestoreBackup, startAuthBackup } from '@/services/backup-service';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type BackupStatus = 'idle' | 'running' | 'success' | 'error';
interface BackupTask {
    status: BackupStatus;
    message: string;
}

export function BackupManagerView() {
    const [backupTypes, setBackupTypes] = useState<string[]>(['firestore', 'auth']);
    const [firestoreStatus, setFirestoreStatus] = useState<BackupTask>({ status: 'idle', message: '' });
    const [authStatus, setAuthStatus] = useState<BackupTask>({ status: 'idle', message: '' });
    const [isRunning, setIsRunning] = useState(false);

    const { toast } = useToast();

    const handleCheckboxChange = (type: 'firestore' | 'auth') => {
        setBackupTypes(prev => 
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    const handleStartBackup = async () => {
        if (backupTypes.length === 0) {
            toast({ variant: 'destructive', title: 'No backup type selected', description: 'Please select at least one item to back up.' });
            return;
        }

        setIsRunning(true);
        setFirestoreStatus({ status: 'idle', message: '' });
        setAuthStatus({ status: 'idle', message: '' });

        const promises = [];

        if (backupTypes.includes('firestore')) {
            setFirestoreStatus({ status: 'running', message: 'Initiating Firestore backup...' });
            promises.push(
                startFirestoreBackup()
                    .then(result => {
                        setFirestoreStatus({ status: 'success', message: result.message });
                        toast({ title: "Firestore Backup Started", description: result.message });
                    })
                    .catch(error => {
                        setFirestoreStatus({ status: 'error', message: error.message });
                        toast({ variant: 'destructive', title: "Firestore Backup Failed", description: error.message });
                    })
            );
        }

        if (backupTypes.includes('auth')) {
            setAuthStatus({ status: 'running', message: 'Initiating Auth backup...' });
            promises.push(
                startAuthBackup()
                    .then(result => {
                        setAuthStatus({ status: 'success', message: result.message });
                        toast({ title: "Auth Backup Succeeded", description: result.message });
                    })
                    .catch(error => {
                        setAuthStatus({ status: 'error', message: error.message });
                        toast({ variant: 'destructive', title: "Auth Backup Failed", description: error.message });
                    })
            );
        }
        
        await Promise.all(promises);
        setIsRunning(false);
    };

    const StatusIndicator = ({ task }: { task: BackupTask }) => {
        switch (task.status) {
            case 'running':
                return <LoaderCircle className="h-4 w-4 text-blue-500 animate-spin" />;
            case 'success':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'error':
                return <XCircle className="h-4 w-4 text-destructive" />;
            default:
                return null;
        }
    };
    

    return (
        <div className="p-4 sm:p-6 space-y-6 flex flex-col items-center">
            <header className="text-center">
                <h1 className="text-3xl font-bold font-headline text-primary">Backup Manager</h1>
                <p className="text-muted-foreground">managed exports for disaster recovery.</p>
            </header>

            <div className="w-full max-w-2xl space-y-6">
                <Alert className="bg-primary/5 border-primary/20">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <AlertTitle>Proper System Backups</AlertTitle>
                    <AlertDescription className="text-xs space-y-2">
                        <p>These are **not** placeholders. They trigger server-side managed export operations that save your data to a secure Google Cloud Storage bucket.</p>
                        <p><strong>Note on Restoration:</strong> For security reasons, "Restore" is a manual process. If you need to roll back data, you must use the Google Cloud Console or CLI to import these files back into your project.</p>
                    </AlertDescription>
                </Alert>

                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle>Trigger Point-in-Time Export</CardTitle>
                        <CardDescription>Select services to export to your storage bucket.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                            <Checkbox 
                                id="firestore" 
                                checked={backupTypes.includes('firestore')} 
                                onCheckedChange={() => handleCheckboxChange('firestore')}
                            />
                            <Label htmlFor="firestore" className="flex-1 flex items-center gap-2 text-base cursor-pointer">
                                <Database className="h-5 w-5 text-primary" />
                                <div>
                                    <p className="font-semibold">Firestore Database</p>
                                    <p className="text-xs text-muted-foreground">Managed export of all collections and documents.</p>
                                </div>
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                            <Checkbox 
                                id="auth" 
                                checked={backupTypes.includes('auth')} 
                                onCheckedChange={() => handleCheckboxChange('auth')}
                            />
                            <Label htmlFor="auth" className="flex-1 flex items-center gap-2 text-base cursor-pointer">
                                <Users className="h-5 w-5 text-primary" />
                                <div>
                                    <p className="font-semibold">Authentication Users</p>
                                    <p className="text-xs text-muted-foreground">JSON export of all user accounts and metadata.</p>
                                </div>
                            </Label>
                        </div>
                        
                        {(firestoreStatus.status !== 'idle' || authStatus.status !== 'idle') && (
                            <div className="mt-6 p-4 rounded-lg bg-muted space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Current Session Status:</h4>
                                {backupTypes.includes('firestore') && (
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                        <StatusIndicator task={firestoreStatus} />
                                        <span>Firestore: {firestoreStatus.message}</span>
                                    </div>
                                )}
                                {backupTypes.includes('auth') && (
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                        <StatusIndicator task={authStatus} />
                                        <span>Authentication: {authStatus.message}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4 border-t pt-6 bg-muted/10">
                        <Button onClick={handleStartBackup} disabled={isRunning} className="w-full h-12 text-lg font-bold">
                            {isRunning ? (
                                <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                            ) : null}
                            {isRunning ? 'Backups in Progress...' : 'Start Managed Backup'}
                        </Button>
                        <p className="text-[10px] text-center text-muted-foreground">
                            Backups are saved to: <code className="bg-muted px-1 rounded">gs://[project-id]-backups/</code>
                        </p>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Info className="h-4 w-4" /> Disaster Recovery Help
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground space-y-2">
                        <p>To view your backups or perform a restore:</p>
                        <ol className="list-decimal pl-4 space-y-1">
                            <li>Go to the <strong>Google Cloud Console</strong>.</li>
                            <li>Navigate to <strong>Cloud Storage</strong> &gt; <strong>Buckets</strong>.</li>
                            <li>Open the <code>-backups</code> bucket to download your data.</li>
                            <li>To restore Firestore, use the <code>gcloud firestore import</code> command pointing to the generated folder.</li>
                        </ol>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

    