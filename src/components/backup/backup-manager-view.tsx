
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { LoaderCircle, Database, Users, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { startFirestoreBackup, startAuthBackup } from '@/services/backup-service';

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
                <p className="text-muted-foreground">Backup your Firestore database and Authentication users.</p>
            </header>

            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle>Create New Backup</CardTitle>
                    <CardDescription>Select the services you want to back up and start the process.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <Checkbox 
                            id="firestore" 
                            checked={backupTypes.includes('firestore')} 
                            onCheckedChange={() => handleCheckboxChange('firestore')}
                        />
                        <Label htmlFor="firestore" className="flex items-center gap-2 text-base">
                            <Database className="h-5 w-5 text-primary" />
                            Firestore Database
                        </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                         <Checkbox 
                            id="auth" 
                            checked={backupTypes.includes('auth')} 
                            onCheckedChange={() => handleCheckboxChange('auth')}
                        />
                        <Label htmlFor="auth" className="flex items-center gap-2 text-base">
                            <Users className="h-5 w-5 text-primary" />
                            Authentication Users
                        </Label>
                    </div>
                    
                    {(firestoreStatus.status !== 'idle' || authStatus.status !== 'idle') && (
                        <div className="pt-4 space-y-2">
                            <h4 className="font-semibold">Backup Status:</h4>
                            {backupTypes.includes('firestore') && (
                                <div className="flex items-center gap-2 text-sm">
                                    <StatusIndicator task={firestoreStatus} />
                                    <span>Firestore: {firestoreStatus.message}</span>
                                </div>
                            )}
                            {backupTypes.includes('auth') && (
                                <div className="flex items-center gap-2 text-sm">
                                    <StatusIndicator task={authStatus} />
                                    <span>Authentication: {authStatus.message}</span>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button onClick={handleStartBackup} disabled={isRunning} className="w-full">
                        {isRunning ? (
                            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        {isRunning ? 'Backups in Progress...' : 'Start Backup Now'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
