
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DatabaseBackup, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { initiateBackup } from '@/services/backup-service';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

export function BackupManagerView() {
    const [isLoading, setIsLoading] = useState(false);
    const [lastBackupStatus, setLastBackupStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [backupMessage, setBackupMessage] = useState<string | null>(null);
    const { toast } = useToast();

    const handleBackup = async () => {
        setIsLoading(true);
        setLastBackupStatus('idle');
        setBackupMessage(null);

        try {
            const result = await initiateBackup();
            setLastBackupStatus('success');
            setBackupMessage(`Backup initiated successfully. Operation ID: ${result.operationName}`);
            toast({
                title: "Backup Initiated",
                description: "Your database export has started successfully.",
            });
        } catch (error: any) {
            setLastBackupStatus('error');
            setBackupMessage(error.message || "An unexpected error occurred.");
            toast({
                title: "Backup Failed",
                description: error.message || "Could not start the backup process.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-10 space-y-8">
            <div className="flex flex-col space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Backup Manager</h1>
                <p className="text-muted-foreground">
                    Secure your data by exporting your database to Google Cloud Storage.
                </p>
            </div>

            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <div className="flex items-center space-x-4">
                        <div className="p-2 bg-primary/10 rounded-full">
                            <DatabaseBackup className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Database Export</CardTitle>
                            <CardDescription>
                                Create a full backup of your Firestore database.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-sm text-muted-foreground bg-muted p-4 rounded-md">
                        <p>
                            <strong>Note:</strong> This process initiates an export of all your data (collections and documents) to a secure storage bucket.
                            The process runs in the background. You can continue using the application while the backup is performed.
                        </p>
                    </div>

                    {lastBackupStatus === 'success' && (
                        <Alert className="border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-900">
                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                            <AlertTitle className="text-green-800 dark:text-green-300">Success</AlertTitle>
                            <AlertDescription className="text-green-700 dark:text-green-400">
                                {backupMessage}
                            </AlertDescription>
                        </Alert>
                    )}

                    {lastBackupStatus === 'error' && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>
                                {backupMessage}
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
                <CardFooter>
                    <Button 
                        onClick={handleBackup} 
                        disabled={isLoading} 
                        className="w-full sm:w-auto"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Initiating Backup...
                            </>
                        ) : (
                            <>
                                <DatabaseBackup className="mr-2 h-4 w-4" />
                                Start Backup Now
                            </>
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
