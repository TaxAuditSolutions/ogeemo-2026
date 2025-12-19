
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
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
import { LoaderCircle, Printer, MoreVertical, BookOpen, Trash2, Clock, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useReactToPrint } from '@/hooks/use-react-to-print';
import { getWorkers, type Worker } from '@/services/payroll-service';
import { getTasksForUser, updateTask, deleteTask, type Event as TaskEvent } from '@/services/project-service';
import { ReportsPageHeader } from './page-header';
import { WorkerFormDialog } from '../accounting/WorkerFormDialog';
import { LogTimeDialog } from './log-time-dialog';
import { formatTime } from '@/lib/utils';

export function TimeLogReport() {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [allEntries, setAllEntries] = useState<TaskEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [entryToDelete, setEntryToDelete] = useState<TaskEvent | null>(null);
    const [isLogTimeDialogOpen, setIsLogTimeDialogOpen] = useState(false);
    const [isWorkerFormOpen, setIsWorkerFormOpen] = useState(false);

    const { user } = useAuth();
    const { toast } = useToast();
    const { handlePrint, contentRef } = useReactToPrint();
    const router = useRouter();

    const loadData = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const [fetchedWorkers, entries] = await Promise.all([
                getWorkers(user.uid),
                getTasksForUser(user.uid),
            ]);
            setWorkers(fetchedWorkers);
            // Filter to only include entries that are time logs (have workerId and duration)
            const timeLogEntries = entries.filter(entry => entry.workerId && (entry.duration || 0) > 0);
            setAllEntries(timeLogEntries);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to load data', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const totalDuration = useMemo(() => allEntries.reduce((acc, entry) => acc + (entry.duration || 0), 0), [allEntries]);
    
    const handleEditTask = (task: TaskEvent) => {
        router.push(`/master-mind?eventId=${task.id}`);
    };

    const handleConfirmDelete = async () => {
        if (!entryToDelete) return;
        const originalEntries = [...allEntries];
        setAllEntries(prev => prev.filter(e => e.id !== entryToDelete.id));
        try {
            await deleteTask(entryToDelete.id);
            toast({ title: "Entry Deleted", description: `The log entry "${entryToDelete.title}" has been removed.` });
        } catch (error: any) {
            setAllEntries(originalEntries);
            toast({ variant: "destructive", title: "Delete Failed", description: error.message });
        } finally {
            setEntryToDelete(null);
        }
    };
    
    const handleWorkerSaved = (newOrUpdatedWorker: Worker) => {
        loadData();
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <ReportsPageHeader pageTitle="Time Log Report" />
                    <header className="text-center pt-4">
                        <h1 className="text-3xl font-bold font-headline text-primary">Time Log Report</h1>
                        <p className="text-muted-foreground">Review and manage all logged work hours for your team.</p>
                    </header>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div ref={contentRef}>
                        <Card className="print:border-none print:shadow-none">
                            <CardHeader>
                                <CardTitle>All Time Log Entries</CardTitle>
                                <CardDescription>A complete list of all recorded work sessions.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="flex justify-center items-center h-48"><LoaderCircle className="h-8 w-8 animate-spin" /></div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Worker</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead className="text-right">Duration</TableHead>
                                                <TableHead className="w-10 print:hidden"><span className="sr-only">Actions</span></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {allEntries.length > 0 ? allEntries.map(entry => {
                                                    const workerName = workers.find(w => w.id === entry.workerId)?.name;
                                                    return (
                                                        <TableRow key={entry.id}>
                                                            <TableCell>{workerName || 'Unknown Worker'}</TableCell>
                                                            <TableCell>{entry.start ? format(new Date(entry.start), 'yyyy-MM-dd') : 'N/A'}</TableCell>
                                                            <TableCell>{entry.description || entry.title}</TableCell>
                                                            <TableCell className="text-right font-mono">{formatTime(entry.duration || 0)}</TableCell>
                                                            <TableCell className="print:hidden">
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end">
                                                                        <DropdownMenuItem onSelect={() => handleEditTask(entry)}><BookOpen className="mr-2 h-4 w-4"/>Open / Edit</DropdownMenuItem>
                                                                        <DropdownMenuItem className="text-destructive" onSelect={() => setEntryToDelete(entry)}><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                }) : (
                                                    <TableRow><TableCell colSpan={5} className="h-24 text-center">No time entries found.</TableCell></TableRow>
                                                )}
                                        </TableBody>
                                        <TableFooter>
                                            <TableRow>
                                                <TableCell colSpan={3} className="font-bold">Total Logged Time</TableCell>
                                                <TableCell className="text-right font-bold font-mono">{formatTime(totalDuration)}</TableCell>
                                                <TableCell className="print:hidden"/>
                                            </TableRow>
                                        </TableFooter>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </CardContent>
                <CardFooter className="justify-between">
                     <div className="flex gap-2">
                        <Button onClick={() => setIsLogTimeDialogOpen(true)}>
                            <Clock className="mr-2 h-4 w-4" /> Log a Time Entry
                        </Button>
                        <Button variant="outline" onClick={() => setIsWorkerFormOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" /> Add Worker
                        </Button>
                    </div>
                    <Button variant="outline" onClick={handlePrint} disabled={isLoading}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print Report
                    </Button>
                </CardFooter>
            </Card>
            <AlertDialog open={!!entryToDelete} onOpenChange={() => setEntryToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>This action will permanently delete the log entry: "{entryToDelete?.title}". This cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <LogTimeDialog
                isOpen={isLogTimeDialogOpen}
                onOpenChange={setIsLogTimeDialogOpen}
                workerId={null}
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
