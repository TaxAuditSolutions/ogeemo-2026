
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  DropdownMenuSeparator,
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
import { LoaderCircle, PlusCircle, MoreVertical, Edit, Trash2, FilterX, ChevronsUpDown, Check, User, Calendar as CalendarIcon, FileText } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getWorkers, type Worker } from '@/services/payroll-service';
import { getTimeLogs, deleteTimeLog, type TimeLog } from '@/services/timelog-service';
import { formatTime } from '@/lib/utils';
import { ReportsPageHeader } from './page-header';
import { Button } from '@/components/ui/button';
import { WorkerFormDialog } from '@/components/accounting/WorkerFormDialog';
import { LogTimeDialog } from './log-time-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';

export function TimeLogReport() {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [allEntries, setAllEntries] = useState<TimeLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth();
    const { toast } = useToast();

    const [isLogTimeDialogOpen, setIsLogTimeDialogOpen] = useState(false);
    const [isWorkerFormOpen, setIsWorkerFormOpen] = useState(false);
    const [entryToEdit, setEntryToEdit] = useState<TimeLog | null>(null);
    const [entryToDelete, setEntryToDelete] = useState<TimeLog | null>(null);
    const [preselectedWorkerId, setPreselectedWorkerId] = useState<string | null>(null);
    
    const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
    const [isWorkerPopoverOpen, setIsWorkerPopoverOpen] = useState(false);
    
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);


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
    
    const filteredEntries = useMemo(() => {
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

        return entries;
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
    
    const handleWorkerSaved = () => {
        loadData();
    };

    const handleDateRangeSelect = (range: DateRange | undefined) => {
        setDateRange(range);
        if (range?.from && range?.to) {
            setIsDatePickerOpen(false);
        }
    };
    
    const selectedWorker = workers.find(w => w.id === selectedWorkerId);

    return (
        <>
            <Card>
                <CardHeader>
                    <ReportsPageHeader pageTitle="Time Log Report" />
                    <header className="text-center pt-4">
                        <h1 className="text-3xl font-bold font-headline text-primary">Time Log Report</h1>
                        <p className="text-muted-foreground">A list of all recorded work sessions.</p>
                        <div className="mt-4 flex justify-center gap-2">
                             <Popover open={isWorkerPopoverOpen} onOpenChange={setIsWorkerPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline">
                                        <User className="mr-2 h-4 w-4" />
                                        {selectedWorker ? `Filtering: ${selectedWorker.name}` : "Select Worker"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-0">
                                    <Command>
                                        <CommandInput placeholder="Search workers..." />
                                        <CommandList>
                                            <CommandEmpty>No worker found.</CommandEmpty>
                                            <CommandGroup>
                                                {workers.map(worker => (
                                                    <CommandItem
                                                        key={worker.id}
                                                        value={worker.name}
                                                        onSelect={() => {
                                                            setSelectedWorkerId(worker.id);
                                                            setIsWorkerPopoverOpen(false);
                                                        }}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", selectedWorkerId === worker.id ? "opacity-100" : "opacity-0")} />
                                                        {worker.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            
                            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateRange?.from ? 
                                            dateRange.to ? `${format(dateRange.from, 'LLL dd, y')} - ${format(dateRange.to, 'LLL dd, y')}` : format(dateRange.from, 'LLL dd, y')
                                            : "Filter by date"
                                        }
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={dateRange?.from}
                                        selected={dateRange}
                                        onSelect={handleDateRangeSelect}
                                        numberOfMonths={2}
                                    />
                                    <div className="p-2 border-t flex justify-end gap-2">
                                        <Button size="sm" variant="ghost" onClick={() => handleDateRangeSelect({ from: new Date(), to: new Date() })}>Today</Button>
                                        <Button size="sm" variant="ghost" onClick={() => handleDateRangeSelect({ from: startOfWeek(new Date()), to: endOfWeek(new Date()) })}>This Week</Button>
                                        <Button size="sm" variant="ghost" onClick={() => handleDateRangeSelect({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })}>This Month</Button>
                                        <Button size="sm" variant="outline" onClick={() => { setDateRange(undefined); setIsDatePickerOpen(false); }}>Clear</Button>
                                    </div>
                                </PopoverContent>
                            </Popover>

                            <Button variant="outline" onClick={() => handleOpenLogTimeDialog(null)}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Log Event
                            </Button>
                            <Button variant="outline" onClick={() => setIsWorkerFormOpen(true)}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Worker
                            </Button>
                            {(selectedWorkerId || dateRange) && (
                                <Button variant="ghost" onClick={() => { setSelectedWorkerId(null); setDateRange(undefined); }}>
                                    <FilterX className="mr-2 h-4 w-4" /> Clear Filters
                                </Button>
                            )}
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
                                ) : filteredEntries.length > 0 ? (
                                    filteredEntries.map(entry => (
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
                                                        <DropdownMenuItem onSelect={() => setSelectedWorkerId(entry.workerId)}>
                                                            <FileText className="mr-2 h-4 w-4" /> View Worker Report
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
                                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                            No time log entries found for this selection.
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
