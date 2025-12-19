
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoaderCircle, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getWorkers, type Worker } from '@/services/payroll-service';
import { getTimeLogs, type TimeLog } from '@/services/timelog-service'; // UPDATED
import { formatTime } from '@/lib/utils';
import { ReportsPageHeader } from './page-header';
import { Button } from '@/components/ui/button';
import { WorkerFormDialog } from '@/components/accounting/WorkerFormDialog';
import { LogTimeDialog } from './log-time-dialog';

export function TimeLogReport() {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [allEntries, setAllEntries] = useState<TimeLog[]>([]); // UPDATED
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth();
    const { toast } = useToast();

    // State for Dialogs
    const [isLogTimeDialogOpen, setIsLogTimeDialogOpen] = useState(false);
    const [isWorkerFormOpen, setIsWorkerFormOpen] = useState(false);
    const [selectedWorkerIdForDialog, setSelectedWorkerIdForDialog] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const [fetchedWorkers, entries] = await Promise.all([
                getWorkers(user.uid),
                getTimeLogs(user.uid), // UPDATED to use getTimeLogs
            ]);
            setWorkers(fetchedWorkers);
            setAllEntries(entries); // No need to filter here anymore
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to load data', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleOpenLogTimeDialog = () => {
        setSelectedWorkerIdForDialog(null);
        setIsLogTimeDialogOpen(true);
    };

    const handleWorkerSaved = () => {
        loadData();
    };
    
    return (
        <>
            <Card>
                <CardHeader>
                    <ReportsPageHeader pageTitle="Time Log Report" />
                    <header className="text-center pt-4">
                        <h1 className="text-3xl font-bold font-headline text-primary">Time Log Report</h1>
                        <p className="text-muted-foreground">A list of all recorded work sessions.</p>
                        <div className="mt-4 flex justify-center gap-2">
                            <Button onClick={handleOpenLogTimeDialog}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Time Entry
                            </Button>
                            <Button variant="outline" onClick={() => setIsWorkerFormOpen(true)}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Worker
                            </Button>
                        </div>
                    </header>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Worker</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Duration</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24">
                                            <LoaderCircle className="mx-auto h-6 w-6 animate-spin" />
                                        </TableCell>
                                    </TableRow>
                                ) : allEntries.length > 0 ? (
                                    allEntries.map(entry => (
                                        <TableRow key={entry.id}>
                                            <TableCell>{entry.workerName}</TableCell>
                                            <TableCell>{entry.startTime ? format(new Date(entry.startTime), 'yyyy-MM-dd') : 'N/A'}</TableCell>
                                            <TableCell>{entry.notes}</TableCell>
                                            <TableCell className="text-right font-mono">{formatTime(entry.durationSeconds)}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                            No time log entries found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <LogTimeDialog 
                isOpen={isLogTimeDialogOpen} 
                onOpenChange={setIsLogTimeDialogOpen} 
                workerId={selectedWorkerIdForDialog} 
                workers={workers} 
                onTimeLogged={loadData} 
            />

            <WorkerFormDialog 
                isOpen={isWorkerFormOpen} 
                onOpenChange={setIsWorkerFormOpen} 
                onWorkerSave={handleWorkerSaved} 
            />
        </>
    );
}
