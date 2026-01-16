
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DatabaseBackup, LoaderCircle, CheckCircle2, AlertCircle, Users } from 'lucide-react';
import { initiateBackup, type BackupType } from '@/services/backup-service';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';

type BackupStatus = {
    status: 'idle' | 'loading' | 'success' | 'error';
    message: string | null;
};

export function BackupManagerView() {
    const [selectedBackups, setSelectedBackups] = useState<BackupType[]>(['firestore', 'auth']);
    const [firestoreStatus, setFirestoreStatus] = useState<BackupStatus>({ status: 'idle', message: null });
    const [authStatus, setAuthStatus] = useState<BackupStatus>({ status: 'idle', message: null });
    const { toast } = useToast();

    const isRunning = firestoreStatus.status === 'loading' || authStatus.status === 'loading';

    const handleBackup = async () => {
        if (selectedBackups.length === 0) {
            toast({ variant: 'destructive', title: 'No selection', description: 'Please select at least one backup type.' });
            return;
        }
        
        // Reset statuses before starting
        setFirestoreStatus({ status: 'idle', message: null });
        setAuthStatus({ status: 'idle', message: null });

        const runBackup = async (type: BackupType, setStatus: React.Dispatch<React.SetStateAction<BackupStatus>>) => {
            setStatus({ status: 'loading', message: `Initiating ${type} backup...` });
            try {
                const result = await initiateBackup(type);
                const successMessage = type === 'firestore' 
                    ? `Firestore backup initiated. Operation: ${result.operationName}` 
                    : `Auth backup created: ${result.fileName}`;
                setStatus({ status: 'success', message: successMessage });
                toast({ title: `${type.charAt(0).toUpperCase() + type.slice(1)} Backup Started`, description: successMessage });
            } catch (error: any) {
                setStatus({ status: 'error', message: error.message || "An unexpected error occurred." });
                toast({
                    title: `${type.charAt(0).toUpperCase() + type.slice(1)} Backup Failed`,
                    description: error.message,
                    variant: "destructive"
                });
            }
        };

        if (selectedBackups.includes('firestore')) {
            runBackup('firestore', setFirestoreStatus);
        }
        if (selectedBackups.includes('auth')) {
            runBackup('auth', setAuthStatus);
        }
    };
    
    const handleCheckboxChange = (type: BackupType) => {
        setSelectedBackups(prev => 
            prev.includes(type)
                ? prev.filter(b => b !== type)
                : [...prev, type]
        );
    };

    const renderStatus = (status: BackupStatus) => {
        if (status.status === 'idle') return null;
        if (status.status === 'loading') {
            return <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2"><LoaderCircle className="h-4 w-4 animate-spin" /> {status.message}</div>
        }
        if (status.status === 'success') {
            return (
                <Alert className="mt-2 border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-900">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <AlertTitle className="text-green-800 dark:text-green-300">Success</AlertTitle>
                    <AlertDescription className="text-green-700 dark:text-green-400 text-xs break-all">
                        {status.message}
                    </AlertDescription>
                </Alert>
            );
        }
        if (status.status === 'error') {
            return (
                <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription className="text-xs">
                        {status.message}
                    </AlertDescription>
                </Alert>
            );
        }
    };

    return (
        <div className="container mx-auto py-10 space-y-8">
            <div className="flex flex-col space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Backup Manager</h1>
                <p className="text-muted-foreground">
                    Secure your data by exporting your database and user accounts to Google Cloud Storage.
                </p>
            </div>

            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle>Create a Backup</CardTitle>
                    <CardDescription>
                        Select the data you want to include in the backup. The backup will be saved to a secure Google Cloud Storage bucket named after your project ID.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-3 rounded-md border p-4">
                        <div className="flex items-center space-x-3">
                            <Checkbox id="firestore" checked={selectedBackups.includes('firestore')} onCheckedChange={() => handleCheckboxChange('firestore')} />
                            <Label htmlFor="firestore" className="flex items-center gap-2 text-base font-medium">
                                <DatabaseBackup className="h-5 w-5" /> Firestore Database
                            </Label>
                        </div>
                        <p className="pl-8 text-sm text-muted-foreground">A full export of all your collections and documents.</p>
                        {renderStatus(firestoreStatus)}
                    </div>
                     <div className="space-y-3 rounded-md border p-4">
                        <div className="flex items-center space-x-3">
                            <Checkbox id="auth" checked={selectedBackups.includes('auth')} onCheckedChange={() => handleCheckboxChange('auth')} />
                            <Label htmlFor="auth" className="flex items-center gap-2 text-base font-medium">
                                <Users className="h-5 w-5" /> User Accounts
                            </Label>
                        </div>
                        <p className="pl-8 text-sm text-muted-foreground">An export of all Firebase Authentication user records.</p>
                        {renderStatus(authStatus)}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button 
                        onClick={handleBackup} 
                        disabled={isRunning || selectedBackups.length === 0} 
                        className="w-full sm:w-auto"
                    >
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
