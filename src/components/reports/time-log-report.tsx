
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { LoaderCircle, ChevronsUpDown, Check, Printer, Calendar as CalendarIcon, MoreVertical, BookOpen, Clock, PlusCircle, Plus } from 'lucide-react';
import { format, startOfMonth, set } from 'date-fns';
import { type DateRange } from "react-day-picker";
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useReactToPrint } from '@/hooks/use-react-to-print';
import { getWorkers, type Worker } from '@/services/payroll-service';
import { getTasksForUser, updateTask, deleteTask, type Event as TaskEvent, addTask } from '@/services/project-service';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { ReportsPageHeader } from './page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { WorkerFormDialog } from '../accounting/WorkerFormDialog';

const formatTime = (totalSeconds: number) => {
    if (!totalSeconds) return '0h 0m';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
};

const endOfDay = (date: Date) => {
    const newDate = new Date(date);
    newDate.setHours(23, 59, 59, 999);
    return newDate;
};

export function TimeLogReport() {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [allEntries, setAllEntries] = useState<TaskEvent[]>([]);
    const [displayedEntries, setDisplayedEntries] = useState<TaskEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [selectedWorkerId, setSelectedWorkerId] = useState<string>('all');
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [isWorkerPopoverOpen, setIsWorkerPopoverOpen] = useState(false);
    
    const [entryToDelete, setEntryToDelete] = useState<TaskEvent | null>(null);
    const [isLogTimeDialogOpen, setIsLogTimeDialogOpen] = useState(false);
    const [showTestCard, setShowTestCard] = useState(false);
    const [isWorkerFormOpen, setIsWorkerFormOpen] = useState(false);


    // State for Test Card fields
    const [testWorker, setTestWorker] = useState<string>('');
    const [testDate, setTestDate] = useState<Date | undefined>(new Date());
    const [testDescription, setTestDescription] = useState('');
    const [testDuration, setTestDuration] = useState({ hours: '', minutes: '' });

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
            const timeLogEntries = entries.filter(entry => (entry.duration || 0) > 0 && entry.workerId);
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
    
    const handleViewLogs = useCallback(() => {
        let filtered = allEntries;

        // 1. Filter by worker
        if (selectedWorkerId && selectedWorkerId !== 'all') {
            filtered = filtered.filter(entry => entry.workerId === selectedWorkerId);
        }

        // 2. Filter by date range
        if (dateRange?.from) {
            const toDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
            filtered = filtered.filter(entry => {
                if (!entry.start) return false;
                const entryDate = new Date(entry.start);
                return entryDate >= dateRange.from! && entryDate <= toDate;
            });
        }
        
        setDisplayedEntries(filtered);
    }, [allEntries, selectedWorkerId, dateRange]);

    useEffect(() => {
        handleViewLogs();
    }, [allEntries, handleViewLogs]);
    
    const handleLogTestEntry = async () => {
        if (!user) return;
        const durationHours = Number(testDuration.hours) || 0;
        const durationMinutes = Number(testDuration.minutes) || 0;
        const totalDurationSeconds = (durationHours * 3600) + (durationMinutes * 60);

        if (!testWorker || !testDate || totalDurationSeconds <= 0) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select a worker, date, and enter a valid duration.' });
            return;
        }

        try {
            const startTime = set(testDate, { hours: 9, minutes: 0 }); // Default to 9 AM
            const endTime = new Date(startTime.getTime() + totalDurationSeconds * 1000);

            const taskData = {
                title: testDescription || `Manual Time Entry`,
                description: testDescription,
                start: startTime,
                end: endTime,
                duration: totalDurationSeconds,
                workerId: testWorker,
                userId: user.uid,
                status: 'done' as const,
                isBillable: false, // Default to non-billable for simplicity
                position: 0,
            };

            await addTask(taskData);
            toast({
                title: "Test Entry Logged",
                description: "The time log has been added successfully."
            });
            // Clear form and refresh data
            setTestDescription('');
            setTestDuration({ hours: '', minutes: '' });
            await loadData();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        }
    };

    const totalDuration = useMemo(() => displayedEntries.reduce((acc, entry) => acc + (entry.duration || 0), 0), [displayedEntries]);
    
    const setMonthToDate = () => setDateRange({ from: startOfMonth(new Date()), to: new Date() });
    
    const clearDates = () => {
        setDateRange(undefined);
    };

    const handleEditTask = (task: TaskEvent) => {
      router.push(`/master-mind?eventId=${task.id}`);
    };

    const handleConfirmDelete = async () => {
        if (!entryToDelete) return;
        const originalEntries = [...allEntries];
        try {
            await deleteTask(entryToDelete.id);
            await loadData();
            toast({ title: "Entry Deleted", description: `The log entry "${entryToDelete.title}" has been removed.` });
        } catch (error: any) {
            setAllEntries(originalEntries);
            toast({ variant: "destructive", title: "Delete Failed", description: error.message });
        } finally {
            setEntryToDelete(null);
        }
    };
    
    const selectedWorker = workers.find(c => c.id === selectedWorkerId);
    
    const handleWorkerSaved = (newOrUpdatedWorker: Worker) => {
        // Refresh the worker list to include the new addition/update
        loadData();
        // Optionally, select the new worker
        setSelectedWorkerId(newOrUpdatedWorker.id);
    };


    return (
        <>
            <div className="space-y-6">
                <ReportsPageHeader pageTitle={"Time Log Report"} />
                <header className="text-center">
                  <h1 className="text-3xl font-bold font-headline text-primary">Time Log Report</h1>
                </header>
                <Card className="print:hidden">
                    <CardHeader>
                        <CardTitle>Report Filters</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Worker</Label>
                            <div className="flex gap-2">
                                <Popover open={isWorkerPopoverOpen} onOpenChange={setIsWorkerPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" className="w-full justify-between">
                                            {selectedWorkerId === 'all' ? "All Workers" : (selectedWorker?.name || "Select worker...")}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command><CommandInput placeholder="Search workers..." /><CommandList><CommandEmpty>{isLoading ? <LoaderCircle className="h-4 w-4 animate-spin"/> : "No worker found."}</CommandEmpty>
                                        <CommandGroup>
                                            <CommandItem key="all" value="All Workers" onSelect={() => { setSelectedWorkerId('all'); setIsWorkerPopoverOpen(false); }}>
                                                <Check className={cn("mr-2 h-4 w-4", selectedWorkerId === 'all' ? "opacity-100" : "opacity-0")}/>All Workers
                                            </CommandItem>
                                            {workers.map(c => (<CommandItem key={c.id} value={c.name} onSelect={() => { setSelectedWorkerId(c.id); setIsWorkerPopoverOpen(false); }}> <Check className={cn("mr-2 h-4 w-4", selectedWorkerId === c.id ? "opacity-100" : "opacity-0")}/>{c.name}</CommandItem>))}
                                        </CommandGroup>
                                        </CommandList></Command>
                                    </PopoverContent>
                                </Popover>
                                <Button variant="outline" size="icon" onClick={() => setIsWorkerFormOpen(true)}><Plus className="h-4 w-4"/></Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2">
                                <Label>Start Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateRange?.from && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateRange?.from ? format(dateRange.from, "PPP") : <span>Start Date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateRange?.from} onSelect={(date) => { setDateRange(prev => ({...prev, from: date})); }} disabled={(date) => dateRange?.to ? date > dateRange.to : false} initialFocus /></PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label>End Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateRange?.to && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateRange?.to ? format(dateRange.to, "PPP") : <span>End Date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateRange?.to} onSelect={(date) => { setDateRange(prev => ({...prev, to: date})); }} disabled={(date) => dateRange?.from ? date < dateRange.from : false} initialFocus /></PopoverContent>
                                </Popover>
                            </div>
                            <Button variant="secondary" onClick={setMonthToDate} className="w-full">Month to Date</Button>
                            <Button variant="ghost" onClick={clearDates} className="w-full">All Dates</Button>
                        </div>
                    </CardContent>
                    <CardFooter className="gap-2">
                        <Button onClick={() => setShowTestCard(prev => !prev)}>Test</Button>
                    </CardFooter>
                </Card>

                {showTestCard && (
                  <Card>
                      <CardHeader>
                          <CardTitle>Test Card</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="test-worker">Worker</Label>
                                <Select value={testWorker} onValueChange={setTestWorker}>
                                    <SelectTrigger id="test-worker">
                                        <SelectValue placeholder="Select a worker" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {workers.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="test-date">Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {testDate ? format(testDate, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={testDate} onSelect={setTestDate} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="test-description">Description</Label>
                            <Input id="test-description" value={testDescription} onChange={e => setTestDescription(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Duration</Label>
                            <div className="flex items-center gap-2">
                                <Input type="number" placeholder="Hours" value={testDuration.hours} onChange={e => setTestDuration(p => ({...p, hours: e.target.value}))} />
                                <Input type="number" placeholder="Minutes" value={testDuration.minutes} onChange={e => setTestDuration(p => ({...p, minutes: e.target.value}))} />
                            </div>
                        </div>
                      </CardContent>
                       <CardFooter>
                          <Button onClick={handleLogTestEntry}>Log Test Entry</Button>
                      </CardFooter>
                  </Card>
                )}

                <div ref={contentRef}>
                    <Card className="print:border-none print:shadow-none">
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl">Time Log Report for {selectedWorkerId === 'all' ? 'All Workers' : (selectedWorker?.name || "...")}</CardTitle>
                            <CardDescription>
                                {dateRange?.from ? dateRange.to ? `${format(dateRange.from, "PPP")} to ${format(dateRange.to, "PPP")}` : `On ${format(dateRange.from, "PPP")}` : "All Time"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="h-48 flex items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin"/></div>
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
                                        {displayedEntries.length > 0 ? displayedEntries.map(entry => {
                                            const workerName = workers.find(w => w.id === entry.workerId)?.name;
                                            if (!workerName) return null; // Ensure worker exists before rendering row
                                            return (
                                                <TableRow key={entry.id}>
                                                    <TableCell>{workerName}</TableCell>
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
                                            <TableRow><TableCell colSpan={5} className="h-24 text-center">No time entries found for this selection.</TableCell></TableRow>
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
                        <CardFooter className="print:hidden justify-end space-x-2">
                            <Button variant="outline" onClick={handlePrint} disabled={isLoading}>
                                <Printer className="mr-2 h-4 w-4" />
                                Print Report
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
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
            </div>
             <WorkerFormDialog
                isOpen={isWorkerFormOpen}
                onOpenChange={setIsWorkerFormOpen}
                onWorkerSave={handleWorkerSaved}
            />
        </>
    );
}
