
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LoaderCircle, PlusCircle, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getWorkers, type Worker } from '@/services/payroll-service';
import { getTimeLogs, deleteTimeLog, type TimeLog } from '@/services/timelog-service';
import { formatTime } from '@/lib/utils';
import { ReportsPageHeader } from './page-header';
import { Button } from '@/components/ui/button';
import { WorkerFormDialog } from '@/components/accounting/WorkerFormDialog';
import { LogTimeDialog } from './log-time-dialog';
import { useRouter } from 'next/navigation';

export function TimeLogReport() {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [allEntries, setAllEntries] = useState<TimeLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const [isLogTimeDialogOpen, setIsLogTimeDialogOpen] = useState(false);
    const [isWorkerFormOpen, setIsWorkerFormOpen] = useState(false);
    const [entryToEdit, setEntryToEdit] = useState<TimeLog | null>(null);
    const [entryToDelete, setEntryToDelete] = useState<TimeLog | null>(null);
    const [preselectedWorkerId, setPreselectedWorkerId] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const [fetchedWorkers, entries] = await Promise.all([
                getWorkers(user.uid),
                getTimeLogs(user.uid),
            ]);
            setWorkers(fetchedWorkers);
            setAllEntries(entries);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to load data', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleOpenLogTimeDialog = (entry: TimeLog | null = null, preselectWorkerId: string | null = null) => {
        setEntryToEdit(entry);
        setPreselectedWorkerId(preselectWorkerId);
        setIsLogTimeDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!entryToDelete) return;
        try {
            await deleteTimeLog(entryToDelete.id);
            toast({ title: 'Time Log Deleted' });
            loadData(); // Refresh data after delete
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
        } finally {
            setEntryToDelete(null);
        }
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
                            <Button onClick={() => handleOpenLogTimeDialog(null)}>
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
                                    <TableHead>Notes</TableHead>
                                    <TableHead className="text-right">Duration</TableHead>
                                    <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24">
                                            <LoaderCircle className="mx-auto h-6 w-6 animate-spin" />
                                        </TableCell>
                                    </TableRow>
                                ) : allEntries.length > 0 ? (
                                    allEntries.map(entry => (
                                        <TableRow key={entry.id}>
                                            <TableCell className="font-medium">{entry.workerName}</TableCell>
                                            <TableCell>{entry.startTime ? format(new Date(entry.startTime), 'yyyy-MM-dd') : 'N/A'}</TableCell>
                                            <TableCell>{entry.notes}</TableCell>
                                            <TableCell className="text-right font-mono">{formatTime(entry.durationSeconds)}</TableCell>
                                            <TableCell>
                                                 <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onSelect={() => handleOpenLogTimeDialog(entry)}>
                                                            <Edit className="mr-2 h-4 w-4" /> Edit Entry
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => handleOpenLogTimeDialog(null, entry.workerId)}>
                                                            <PlusCircle className="mr-2 h-4 w-4" /> Add New Entry for Worker
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => setEntryToDelete(entry)} className="text-destructive">
                                                            <Trash2 className="mr-2 h-4 w-4" /> Delete Entry
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
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
                onOpenChange={(isOpen) => {
                    setIsLogTimeDialogOpen(isOpen);
                    if (!isOpen) {
                        setEntryToEdit(null); // Clear editing state when dialog closes
                        setPreselectedWorkerId(null);
                    }
                }}
                workers={workers}
                onTimeLogged={loadData}
                entryToEdit={entryToEdit}
                preselectedWorkerId={preselectedWorkerId}
            />

            <WorkerFormDialog 
                isOpen={isWorkerFormOpen} 
                onOpenChange={setIsWorkerFormOpen} 
                onWorkerSave={handleWorkerSaved} 
            />
            
            <AlertDialog open={!!entryToDelete} onOpenChange={() => setEntryToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete this time log entry. This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
