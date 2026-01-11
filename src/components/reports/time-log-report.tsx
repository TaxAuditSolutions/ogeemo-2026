
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
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
import { Button } from '@/components/ui/button';
import { Badge } from '../ui/badge';
import { LoaderCircle, MoreVertical, Edit, Trash2, FilterX, User, Calendar as CalendarIcon, HandCoins } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getWorkers, type Worker } from '@/services/payroll-service';
import { getTimeLogs, deleteTimeLog, updateTimeLog, updateTimeLogsStatus, type TimeLog } from '@/services/timelog-service';
import { addPayableBill } from '@/services/accounting-service';
import { formatTime, cn } from '@/lib/utils';
import { ReportsPageHeader } from './page-header';
import { LogTimeDialog } from './log-time-dialog';
import { WorkerSelector } from './WorkerSelector';
import type { DateRange } from 'react-day-picker';
import { Label } from '../ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CustomCalendar } from '../ui/custom-calendar';


const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

export function TimeLogReport() {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [allEntries, setAllEntries] = useState<TimeLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [isLogTimeDialogOpen, setIsLogTimeDialogOpen] = useState(false);
    const [entryToEdit, setEntryToEdit] = useState<TimeLog | null>(null);
    const [entryToDelete, setEntryToDelete] = useState<TimeLog | null>(null);
    const [preselectedWorkerId, setPreselectedWorkerId] = useState<string | null>(null);
    
    const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
    
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
    const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);

    const [isProcessConfirmationOpen, setIsProcessConfirmationOpen] = useState(false);

    useEffect(() => {
        if (searchParams.get('action') === 'log') {
            setIsLogTimeDialogOpen(true);
            setPreselectedWorkerId(searchParams.get('workerId'));
        }
    }, [searchParams]);

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
    
    const { filteredEntries, totalDurationSeconds } = useMemo(() => {
        let entries = allEntries;

        if (selectedWorkerId) {
            entries = entries.filter(entry => entry.workerId === selectedWorkerId);
        }

        if (dateRange?.from) {
            const rangeEnd = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
            entries = entries.filter(entry => {
                const entryDate = new Date(entry.startTime);
                return isWithinInterval(entryDate, { start: startOfDay(dateRange.from!), end: rangeEnd });
            });
        }

        const totalSeconds = entries.reduce((acc, entry) => acc + entry.durationSeconds, 0);
        return { filteredEntries: entries, totalDurationSeconds: totalSeconds };

    }, [allEntries, selectedWorkerId, dateRange]);

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
            loadData();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
        } finally {
            setEntryToDelete(null);
        }
    };
    
    const handleClearFilters = () => {
        setSelectedWorkerId(null);
        setDateRange(undefined);
    };

    const handleProcessPayment = () => {
      setIsProcessConfirmationOpen(true);
    };

    const handleConfirmProcessPayment = async () => {
        if (!selectedWorker || !user) return;

        const entriesToProcess = filteredEntries.filter(e => e.status === 'unprocessed');
        if (entriesToProcess.length === 0) {
            toast({ title: "No Entries to Process", description: "All entries for this period have already been processed." });
            setIsProcessConfirmationOpen(false);
            return;
        }

        if (selectedWorker.workerType === 'contractor') {
            try {
                await addPayableBill({
                    userId: user.uid,
                    vendor: selectedWorker.name,
                    dueDate: format(new Date(), 'yyyy-MM-dd'),
                    totalAmount: totalPay,
                    category: 'Contractor Fees',
                    description: `Services for period ${dateRange?.from ? format(dateRange.from, 'PP') : ''} to ${dateRange?.to ? format(dateRange.to, 'PP') : ''}`,
                });
                await updateTimeLogsStatus(entriesToProcess.map(e => e.id), 'processed');
                toast({ title: "Bill Created", description: `A payable bill for ${selectedWorker.name} has been added to Accounts Payable.` });
                loadData();
            } catch (error: any) {
                toast({ variant: "destructive", title: "Failed to create bill", description: error.message });
            }
        } else { // Employee
             try {
                await updateTimeLogsStatus(entriesToProcess.map(e => e.id), 'ready-for-payroll');
                toast({ title: "Ready for Payroll", description: `Time logs for ${selectedWorker.name} are marked and ready for the next payroll run.` });
                loadData();
            } catch (error: any) {
                toast({ variant: "destructive", title: "Update Failed", description: error.message });
            }
        }
        setIsProcessConfirmationOpen(false);
    };

    const getStatusBadge = (status: string | undefined) => {
        switch (status) {
            case 'processed':
                return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Processed as Bill</Badge>;
            case 'ready-for-payroll':
                return <Badge variant="secondary" className="bg-purple-100 text-purple-800">Ready for Payroll</Badge>;
            default:
                return <Badge variant="outline">Unprocessed</Badge>;
        }
    };
    
    const selectedWorker = workers.find(w => w.id === selectedWorkerId);
    
    const totalPay = useMemo(() => {
        if (!selectedWorker || selectedWorker.payType !== 'hourly' || totalDurationSeconds <= 0) {
            return 0;
        }
        const hoursWorked = totalDurationSeconds / 3600;
        return hoursWorked * selectedWorker.payRate;
    }, [selectedWorker, totalDurationSeconds]);

    return (
        <>
            <div className="p-4 sm:p-6 space-y-6">
                <ReportsPageHeader pageTitle="Time Log Report" hubPath="/hr-manager" hubLabel="HR Hub" />
                <header className="text-center">
                  <h1 className="text-3xl font-bold font-headline text-primary">Time Log Report</h1>
                  <p className="text-muted-foreground">Review and manage all work sessions logged by your team.</p>
                </header>

                <Card>
                    <CardHeader>
                        <CardTitle>Filters & Actions</CardTitle>
                        <div className="flex flex-wrap items-end gap-4 pt-2">
                             <WorkerSelector
                                workers={workers}
                                selectedWorkerId={selectedWorkerId}
                                onSelect={setSelectedWorkerId}
                                isLoading={isLoading}
                            />
                            
                            <div className="space-y-2">
                                <Label>Start Date</Label>
                                <Popover open={isStartDatePickerOpen} onOpenChange={setIsStartDatePickerOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-48 justify-start text-left font-normal", !dateRange?.from && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateRange?.from ? format(dateRange.from, "PPP") : <span>Start Date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <CustomCalendar mode="single" selected={dateRange?.from} onSelect={(date) => { setDateRange(prev => ({ from: date, to: prev?.to })); setIsStartDatePickerOpen(false); }} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                             <div className="space-y-2">
                                <Label>End Date</Label>
                                <Popover open={isEndDatePickerOpen} onOpenChange={setIsEndDatePickerOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-48 justify-start text-left font-normal", !dateRange?.to && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateRange?.to ? format(dateRange.to, "PPP") : <span>End Date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <CustomCalendar mode="single" selected={dateRange?.to} onSelect={(date) => { setDateRange(prev => ({ from: prev?.from, to: date })); setIsEndDatePickerOpen(false); }} disabled={(date) => dateRange?.from ? date < dateRange.from : false} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <Button variant="ghost" onClick={handleClearFilters} disabled={!selectedWorkerId && !dateRange}>
                                <FilterX className="mr-2 h-4 w-4" /> Clear Filters
                            </Button>
                            
                            <Button variant="outline" onClick={() => handleOpenLogTimeDialog(null, selectedWorkerId)}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Log Time
                            </Button>
                             <Button onClick={handleProcessPayment} disabled={!selectedWorkerId}>
                                <HandCoins className="mr-2 h-4 w-4" /> Process for Payment
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Worker</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Notes</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Duration</TableHead>
                                        <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center h-24">
                                                <LoaderCircle className="mx-auto h-6 w-6 animate-spin" />
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredEntries.length > 0 ? (
                                        filteredEntries.map(entry => (
                                            <TableRow key={entry.id}>
                                                <TableCell className="font-medium">{entry.workerName}</TableCell>
                                                <TableCell>{entry.startTime ? format(new Date(entry.startTime), 'yyyy-MM-dd') : 'N/A'}</TableCell>
                                                <TableCell className="max-w-xs truncate">{entry.notes}</TableCell>
                                                <TableCell>{getStatusBadge(entry.status)}</TableCell>
                                                <TableCell className="text-right font-mono">{formatTime(entry.durationSeconds)}</TableCell>
                                                <TableCell>
                                                     <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onSelect={() => handleOpenLogTimeDialog(entry)}>
                                                                <Edit className="mr-2 h-4 w-4" /> Edit Entry
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
                                            <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                                No time log entries found for this selection.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                                {filteredEntries.length > 0 && (
                                    <TableFooter>
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-right font-bold">Total Hours:</TableCell>
                                            <TableCell className="text-right font-bold font-mono">{formatTime(totalDurationSeconds)}</TableCell>
                                            <TableCell />
                                        </TableRow>
                                        {selectedWorker?.payType === 'hourly' && (
                                            <TableRow className="text-base bg-muted/50">
                                                <TableCell colSpan={4} className="text-right font-bold">Total Pay:</TableCell>
                                                <TableCell className="text-right font-bold font-mono">{formatCurrency(totalPay)}</TableCell>
                                                <TableCell />
                                            </TableRow>
                                        )}
                                    </TableFooter>
                                )}
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            <LogTimeDialog 
                isOpen={isLogTimeDialogOpen} 
                onOpenChange={(isOpen) => {
                    setIsLogTimeDialogOpen(isOpen);
                    if (!isOpen) {
                        setEntryToEdit(null);
                        setPreselectedWorkerId(null);
                    }
                }}
                workers={workers}
                onTimeLogged={loadData}
                entryToEdit={entryToEdit}
                preselectedWorkerId={preselectedWorkerId}
            />
            
            <AlertDialog open={!!entryToDelete} onOpenChange={() => setEntryToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
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

            <Dialog open={isProcessConfirmationOpen} onOpenChange={setIsProcessConfirmationOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Process Payment for {selectedWorker?.name}?</DialogTitle>
                        <DialogDescription>
                            {selectedWorker?.workerType === 'contractor'
                                ? `This will create a new bill of ${formatCurrency(totalPay)} in Accounts Payable for this contractor.`
                                : `This will mark these time entries as "Ready for Payroll" to be included in the next payroll run.`
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsProcessConfirmationOpen(false)}>Cancel</Button>
                        <Button onClick={handleConfirmProcessPayment}>Confirm & Process</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
