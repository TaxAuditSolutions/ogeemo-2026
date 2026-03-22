
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { LoaderCircle, Database, Users, CheckCircle, XCircle, Info, ExternalLink, ShieldCheck, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { startFirestoreBackup, startAuthBackup } from '@/services/backup-service';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type BackupStatus = 'idle' | 'running' | 'success' | 'error';
interface BackupTask {
    status: BackupStatus;
    message: string;
}

/**
 * @fileOverview High-Fidelity Backup & Data Portability node.
 * Implements the "Anti-Greed" policy: members always retain free access to their data.
 */
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
                <h1 className="text-3xl font-bold font-headline text-primary uppercase tracking-tight">Backup & Portability</h1>
                <p className="text-muted-foreground">Managed exports for disaster recovery and membership freedom.</p>
            </header>

            <div className="w-full max-w-2xl space-y-6">
                <Alert className="bg-primary/5 border-primary/20">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <AlertTitle>Data Portability Mandate</AlertTitle>
                    <AlertDescription className="text-xs space-y-2">
                        <p>Ogeemo operates on an <strong>"Ethical Exit"</strong> policy. You own your evidence. Exports are managed server-side and saved to your secure cloud bucket.</p>
                        <p className="font-bold text-primary">Your data remains accessible and free to export even if your subscription is terminated.</p>
                    </AlertDescription>
                </Alert>

                <Card className="shadow-lg border-primary/10">
                    <CardHeader>
                        <CardTitle>Export My Operational Data</CardTitle>
                        <CardDescription>Trigger a point-in-time export of your entire business web.</CardDescription>
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
                                    <p className="font-semibold">BKS Firestore Registry</p>
                                    <p className="text-xs text-muted-foreground">Export all ledgers, contacts, and project nodes.</p>
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
                                    <p className="font-semibold">Authentication Nodes</p>
                                    <p className="text-xs text-muted-foreground">Export system identity metadata.</p>
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
                        <Button onClick={handleStartBackup} disabled={isRunning} className="w-full h-14 text-lg font-bold shadow-lg">
                            {isRunning ? (
                                <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                            ) : <Download className="mr-2 h-5 w-5" />}
                            {isRunning ? 'Orchestrating Export...' : 'Execute Export Mandate'}
                        </Button>
                        <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest">
                            Destination Node: <code className="bg-muted px-1 rounded">gs://[project]-backups/</code>
                        </p>
                    </CardFooter>
                </Card>

                <Card className="bg-muted/30 border-dashed">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Info className="h-4 w-4" /> Portability Instructions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground space-y-2">
                        <p>Ogeemo uses standard JSON and CSV formats for maximum portability. To restore your evidence to a third-party system:</p>
                        <ol className="list-decimal pl-4 space-y-1">
                            <li>Trigger the export mandate above.</li>
                            <li>Access your secure <code>-backups</code> bucket in the Google Cloud Console.</li>
                            <li>Download the resulting <code>.json</code> or <code>.csv</code> payloads.</li>
                            <li>These files are formatted for immediate ingestion by most professional accounting and CRM software.</li>
                        </ol>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
