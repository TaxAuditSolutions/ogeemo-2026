
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '../ui/badge';
import { LoaderCircle, PlusCircle, MoreVertical, Edit, Trash2, FilterX, User, Calendar as CalendarIcon, FileDigit, HandCoins } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getWorkers, addWorker, updateWorker, type Worker } from '@/services/payroll-service';
import { getTimeLogs, deleteTimeLog, type TimeLog, updateTimeLog, updateTimeLogsStatus } from '@/services/timelog-service';
import { addPayableBill } from '@/services/accounting-service';
import { formatTime, cn } from '@/lib/utils';
import { ReportsPageHeader } from './page-header';
import { WorkerFormDialog } from '@/components/accounting/WorkerFormDialog';
import { LogTimeDialog } from './log-time-dialog';
import { WorkerSelector } from './WorkerSelector';
import type { DateRange } from 'react-day-picker';

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

    const [isLogTimeDialogOpen, setIsLogTimeDialogOpen] = useState(false);
    const [isWorkerFormOpen, setIsWorkerFormOpen] = useState(false);
    const [entryToEdit, setEntryToEdit] = useState<TimeLog | null>(null);
    const [entryToDelete, setEntryToDelete] = useState<TimeLog | null>(null);
    const [preselectedWorkerId, setPreselectedWorkerId] = useState<string | null>(null);
    
    const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
    
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    const [isProcessConfirmationOpen, setIsProcessConfirmationOpen] = useState(false);

    // State for debugging
    const [workerListForDebug, setWorkerListForDebug] = useState('');
    const [isTestAlertOpen, setIsTestAlertOpen] = useState(false);

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
        return { filteredEntries: entries.sort((a,b) => b.startTime.getTime() - a.startTime.getTime()), totalDurationSeconds: totalSeconds };

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
            loadData(); // Refresh data after delete
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
        } finally {
            setEntryToDelete(null);
        }
    };
    
    const handleWorkerSaved = async () => {
      await loadData();
      setIsWorkerFormOpen(false);
    };

    const handleDateRangeSelect = (range: DateRange | undefined) => {
        setDateRange(range);
        if (range?.from && range?.to) {
            setIsDatePickerOpen(false);
        } else if (range?.from && !range.to) {
            // If only a single date is picked, keep the popover open
        } else {
             setIsDatePickerOpen(false);
        }
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
                    dueDate: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
                    totalAmount: totalPay,
                    category: 'Contractor Fees',
                    description: `Services for period ${dateRange?.from ? format(dateRange.from, 'PP') : ''} to ${dateRange?.to ? format(dateRange.to, 'PP') : ''}`,
                    invoiceNumber: `TL-${selectedWorker.id.slice(0,5)}-${Date.now()}`
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

    const handleTestClick = () => {
        const workerInfo = workers.map(w => `ID: ${w.id}, Name: ${w.name}, Pay Rate: ${w.payRate}`).join('\n');
        setWorkerListForDebug(workerInfo || "No workers found.");
        setIsTestAlertOpen(true);
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <ReportsPageHeader pageTitle="Time Log Report" hubPath="/reports" hubLabel="Reports" onTestClick={handleTestClick} />
                    <header className="text-center pt-4">
                        <h1 className="text-3xl font-bold font-headline text-primary">Time Log Report</h1>
                        <p className="text-muted-foreground">A list of all recorded work sessions.</p>
                        <div className="mt-4 flex justify-center gap-2">
                            <WorkerSelector
                                workers={workers}
                                selectedWorkerId={selectedWorkerId}
                                onSelect={setSelectedWorkerId}
                                isLoading={isLoading}
                            />
                            
                            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("w-[280px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y")) : <span>Filter by date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={handleDateRangeSelect} numberOfMonths={2} />
                                    <div className="p-2 border-t flex justify-end gap-2">
                                        <Button size="sm" variant="ghost" onClick={() => handleDateRangeSelect({ from: new Date(), to: new Date() })}>Today</Button>
                                        <Button size="sm" variant="ghost" onClick={() => handleDateRangeSelect({ from: startOfWeek(new Date()), to: endOfWeek(new Date()) })}>This Week</Button>
                                        <Button size="sm" variant="ghost" onClick={() => handleDateRangeSelect({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })}>This Month</Button>
                                    </div>
                                </PopoverContent>
                            </Popover>

                            {(selectedWorkerId || dateRange) && (
                                <Button variant="ghost" onClick={() => { setSelectedWorkerId(null); setDateRange(undefined); }}>
                                    <FilterX className="mr-2 h-4 w-4" /> Clear Filters
                                </Button>
                            )}
                            
                            <Button variant="outline" onClick={() => handleOpenLogTimeDialog(null, selectedWorkerId)}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Log Time
                            </Button>
                            <Button variant="outline" onClick={() => setIsWorkerFormOpen(true)}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Worker
                            </Button>
                             <Button onClick={handleProcessPayment} disabled={!selectedWorkerId}>
                                <HandCoins className="mr-2 h-4 w-4" /> Process for Payment
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
                                            <TableCell>{entry.notes}</TableCell>
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
                                                        <DropdownMenuItem onSelect={() => handleOpenLogTimeDialog(null, entry.workerId)}>
                                                            <PlusCircle className="mr-2 h-4 w-4" /> Add New Entry for Worker
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
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
                            {selectedWorker && filteredEntries.length > 0 && (
                                <TableFooter>
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-right font-bold">Total Hours:</TableCell>
                                        <TableCell className="text-right font-bold font-mono">{formatTime(totalDurationSeconds)}</TableCell>
                                        <TableCell />
                                    </TableRow>
                                    {selectedWorker.payType === 'hourly' && (
                                        <>
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-right font-bold">Hourly Rate:</TableCell>
                                                <TableCell className="text-right font-bold font-mono">${selectedWorker.payRate.toFixed(2)}</TableCell>
                                                <TableCell />
                                            </TableRow>
                                            <TableRow className="text-base bg-muted/50">
                                                <TableCell colSpan={4} className="text-right font-bold">Total Pay:</TableCell>
                                                <TableCell className="text-right font-bold font-mono">${totalPay.toFixed(2)}</TableCell>
                                                <TableCell />
                                            </TableRow>
                                        </>
                                    )}
                                </TableFooter>
                            )}
                        </Table>
                    </div>
                </CardContent>
            </Card>
            
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

            <WorkerFormDialog 
                isOpen={isWorkerFormOpen} 
                onOpenChange={setIsWorkerFormOpen} 
                onWorkerSave={handleWorkerSaved}
                onWorkerUpdate={() => {}} // Not needed on this page
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

            <AlertDialog open={isTestAlertOpen} onOpenChange={setIsTestAlertOpen}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Worker Data</AlertDialogTitle>
                    <AlertDialogDescription>
                        The following worker data was fetched from the database:
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <pre className="mt-2 w-full rounded-md bg-slate-950 p-4">
                    <code className="text-white">{workerListForDebug}</code>
                </pre>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => setIsTestAlertOpen(false)}>Close</AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
