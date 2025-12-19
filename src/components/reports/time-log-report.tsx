
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
import { LoaderCircle, ChevronsUpDown, Check, Printer, Calendar as CalendarIcon, MoreVertical, BookOpen, Clock, PlusCircle, Plus, Trash2 } from 'lucide-react';
import { format, startOfMonth, set } from 'date-fns';
import { type DateRange } from "react-day-picker";
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useReactToPrint } from '@/hooks/use-react-to-print';
import { getWorkers, type Worker } from '@/services/payroll-service';
import { getTasksForUser, updateTask, deleteTask, addTask, type Event as TaskEvent } from '@/services/project-service';
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';

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

interface TimeLogEntry {
    id: number;
    date: string;
    startTime: { hour: string; minute: string };
    endTime: { hour: string; minute: string };
    description: string;
}

const emptyLogEntry: Omit<TimeLogEntry, 'id'> = {
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: { hour: '9', minute: '0' },
    endTime: { hour: '17', minute: '0' },
    description: '',
};

interface LogTimeDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    workerId: string | null;
    workers: Worker[];
    onTimeLogged: () => void; // Callback to refresh the report
}

function LogTimeDialog({ isOpen, onOpenChange, workerId: initialWorkerId, workers, onTimeLogged }: LogTimeDialogProps) {
    const [timeEntries, setTimeEntries] = useState<TimeLogEntry[]>([{ id: Date.now(), ...emptyLogEntry }]);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(initialWorkerId);
    const [isWorkerPopoverOpen, setIsWorkerPopoverOpen] = useState(false);

    const { user } = useAuth();
    const { toast } = useToast();
    
    useEffect(() => {
        setSelectedWorkerId(initialWorkerId);
        if (isOpen) {
            setTimeEntries([{ id: Date.now(), ...emptyLogEntry }]);
        }
    }, [isOpen, initialWorkerId]);


    const handleAddEntry = () => {
        setTimeEntries(prev => [...prev, { id: Date.now(), ...emptyLogEntry }]);
    };
    
    const handleRemoveEntry = (id: number) => {
        setTimeEntries(prev => prev.filter(entry => entry.id !== id));
    };

    const handleEntryChange = (id: number, field: keyof TimeLogEntry, value: any) => {
        setTimeEntries(prev => prev.map(entry => entry.id === id ? { ...entry, [field]: value } : entry));
    };
    
    const handleTimeChange = (id: number, timeField: 'startTime' | 'endTime', part: 'hour' | 'minute', value: string) => {
        setTimeEntries(prev => prev.map(entry => {
            if (entry.id === id) {
                return { ...entry, [timeField]: { ...entry[timeField], [part]: value } };
            }
            return entry;
        }));
    };

    const handleSaveAllLogs = async () => {
        if (!user || !selectedWorkerId) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select an employee.' });
            return;
        }
        if (timeEntries.length === 0) {
            toast({ variant: 'destructive', title: 'No Entries', description: 'Please add at least one time entry to log.' });
            return;
        }

        setIsSaving(true);
        try {
            let successfulLogs = 0;
            for (const entry of timeEntries) {
                if (!entry.date) {
                    toast({ variant: 'destructive', title: 'Invalid Entry', description: `Entry for "${entry.description}" is missing a date.`});
                    continue;
                }
                
                const logDate = new Date(entry.date);
                const startTime = set(logDate, { hours: parseInt(entry.startTime.hour), minutes: parseInt(entry.startTime.minute) });
                const endTime = set(logDate, { hours: parseInt(entry.endTime.hour), minutes: parseInt(entry.endTime.minute) });

                if (endTime <= startTime) {
                    toast({ variant: 'destructive', title: 'Invalid Times', description: `End time must be after start time for entry on ${entry.date}.` });
                    continue;
                }

                const durationSeconds = (endTime.getTime() - startTime.getTime()) / 1000;
                
                const taskData = {
                    title: `Time Log: ${workers.find(e => e.id === selectedWorkerId)?.name}`,
                    description: entry.description,
                    start: startTime,
                    end: endTime,
                    duration: durationSeconds,
                    workerId: selectedWorkerId,
                    userId: user.uid,
                    status: 'done' as const,
                    isBillable: false,
                    position: 0,
                };

                await addTask(taskData);
                successfulLogs++;
            }
            
            if (successfulLogs > 0) {
                toast({ title: "Time Logged Successfully", description: `${successfulLogs} time entries have been saved.` });
                onTimeLogged(); // Call the callback to refresh the report
                onOpenChange(false); // Close the dialog
            }

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };
    
    const hourOptions = Array.from({ length: 24 }, (_, i) => ({ value: String(i), label: format(set(new Date(), { hours: i }), 'h a') }));
    const minuteOptions = Array.from({ length: 12 }, (_, i) => { const minutes = i * 5; return { value: String(minutes), label: `:${minutes.toString().padStart(2, '0')}` }; });
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Log Time Card Entry</DialogTitle>
                    <DialogDescription>
                        Add one or more time entries for the selected worker. This will create time logs that can be used to calculate gross pay.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                    
                    <div className="space-y-2 max-w-sm">
                        <Label>Employee / Contractor</Label>
                        <Popover open={isWorkerPopoverOpen} onOpenChange={setIsWorkerPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full justify-between">
                                    {selectedWorkerId ? workers.find(e => e.id === selectedWorkerId)?.name : "Select a worker..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command><CommandInput placeholder="Search workers..." /><CommandList><CommandEmpty>No worker found.</CommandEmpty><CommandGroup>{workers.map(c => (<CommandItem key={c.id} value={c.name} onSelect={() => { setSelectedWorkerId(c.id); setIsWorkerPopoverOpen(false); }}> <Check className={cn("mr-2 h-4 w-4", selectedWorkerId === c.id ? "opacity-100" : "opacity-0")}/>{c.name}</CommandItem>))}</CommandGroup></CommandList></Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {timeEntries.map((entry) => (
                        <div key={entry.id} className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_1.5fr_2fr_auto] gap-4 items-end border p-4 rounded-lg">
                            <div className="space-y-2">
                                <Label htmlFor={`log-date-${entry.id}`}>Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !entry.date && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {entry.date ? format(new Date(entry.date), "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={entry.date ? new Date(entry.date) : undefined} onSelect={(date) => date && handleEntryChange(entry.id, 'date', format(date, 'yyyy-MM-dd'))} initialFocus /></PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label>Start Time</Label>
                                <div className="flex gap-2">
                                    <Select value={entry.startTime.hour} onValueChange={(v) => handleTimeChange(entry.id, 'startTime', 'hour', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{hourOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <Select value={entry.startTime.minute} onValueChange={(v) => handleTimeChange(entry.id, 'startTime', 'minute', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{minuteOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                             <div className="space-y-2">
                                <Label>End Time</Label>
                                <div className="flex gap-2">
                                    <Select value={entry.endTime.hour} onValueChange={(v) => handleTimeChange(entry.id, 'endTime', 'hour', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{hourOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                     <Select value={entry.endTime.minute} onValueChange={(v) => handleTimeChange(entry.id, 'endTime', 'minute', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{minuteOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor={`log-description-${entry.id}`}>Description (Optional)</Label>
                                <Input id={`log-description-${entry.id}`} placeholder="e.g., Regular shift" value={entry.description} onChange={(e) => handleEntryChange(entry.id, 'description', e.target.value)} />
                            </div>
                            <div>
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveEntry(entry.id)} disabled={timeEntries.length <= 1}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        </div>
                    ))}
                     <Button variant="outline" onClick={handleAddEntry}>
                        <Plus className="mr-2 h-4 w-4" /> Add Another Entry
                    </Button>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSaveAllLogs} disabled={isSaving}>
                        {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        Log All Entries ({timeEntries.length})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

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
        loadData();
        setSelectedWorkerId(newOrUpdatedWorker.id);
    };

    return (
        <>
            <div className="space-y-6">
                <ReportsPageHeader pageTitle="Time Log Report" />
                <header className="text-center">
                  <h1 className="text-3xl font-bold font-headline text-primary">Time Log Report</h1>
                </header>

                <Card className="w-full max-w-7xl mx-auto">
                    <CardContent className="pt-6 space-y-6">
                        <Card>
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
                                <Button onClick={() => setIsLogTimeDialogOpen(true)}>
                                    <Clock className="mr-2 h-4 w-4" /> Log a Time Entry
                                </Button>
                            </CardFooter>
                        </Card>
                        
                        <div ref={contentRef}>
                            <Card className="print:border-none print:shadow-none">
                                <CardHeader className="text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <CardTitle className="text-2xl">Time Log Report for {selectedWorkerId === 'all' ? 'All Workers' : (selectedWorker?.name || "...")}</CardTitle>
                                    </div>
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
                    </CardContent>
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
            </div>
            <LogTimeDialog
                isOpen={isLogTimeDialogOpen}
                onOpenChange={setIsLogTimeDialogOpen}
                workerId={selectedWorkerId}
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
