
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
import { ArrowLeft, LoaderCircle, ChevronsUpDown, Check, Printer, Calendar as CalendarIcon, MoreVertical, Pencil, Trash2, BookOpen, Clock, PlusCircle } from 'lucide-react';
import { format, startOfMonth } from 'date-fns';
import { type DateRange } from "react-day-picker";
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useReactToPrint } from '@/hooks/use-react-to-print';
import { getWorkers, type Worker } from '@/services/payroll-service';
import { getTasksForUser, updateTask, deleteTask, type Event as TaskEvent } from '@/services/project-service';
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
    const [isLoading, setIsLoading] = useState(true);
    
    const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [isWorkerPopoverOpen, setIsWorkerPopoverOpen] = useState(false);
    
    const [entryToDelete, setEntryToDelete] = useState<TaskEvent | null>(null);

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
            setAllEntries(entries);
            if (fetchedWorkers.length > 0 && !selectedWorkerId) {
                setSelectedWorkerId(fetchedWorkers[0].id);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to load data', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast, selectedWorkerId]);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const filteredEntries = useMemo(() => {
        if (!selectedWorkerId) return [];
        const { from, to } = dateRange || {};
        
        return allEntries
            .filter(entry => entry.workerId === selectedWorkerId && (entry.duration || 0) > 0)
            .filter(entry => {
                if (!from || !entry.start) return true;
                const entryDate = new Date(entry.start);
                const toDate = to || from;
                return entryDate >= from && entryDate <= endOfDay(toDate);
            });
    }, [selectedWorkerId, allEntries, dateRange]);

    const totalDuration = useMemo(() => filteredEntries.reduce((acc, entry) => acc + (entry.duration || 0), 0), [filteredEntries]);
    
    const setMonthToDate = () => setDateRange({ from: startOfMonth(new Date()), to: new Date() });
    
    const clearDates = () => {
        setDateRange(undefined);
    };

    const handleEditTask = (task: TaskEvent) => {
      router.push(`/master-mind?eventId=${task.id}`);
    };

    const handleConfirmDelete = async () => {
        if (!entryToDelete) return;
        try {
            await deleteTask(entryToDelete.id);
            setAllEntries(prev => prev.filter(e => e.id !== entryToDelete.id));
            toast({ title: "Entry Deleted", description: `The log entry "${entryToDelete.title}" has been removed.` });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Delete Failed", description: error.message });
        } finally {
            setEntryToDelete(null);
        }
    };
    
    const selectedWorker = workers.find(c => c.id === selectedWorkerId);

    const handleLogTimeClick = () => {
        const url = selectedWorkerId
            ? `/hr-manager/log-time?workerId=${selectedWorkerId}`
            : '/hr-manager/log-time';
        router.push(url);
    };

    return (
        <>
            <Card className="print:hidden">
                <CardHeader>
                    <CardTitle>Select a Worker & Date Range</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Worker</Label>
                        <Popover open={isWorkerPopoverOpen} onOpenChange={setIsWorkerPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full justify-between">
                                    {selectedWorker?.name || "Select worker..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command><CommandInput placeholder="Search workers..." /><CommandList><CommandEmpty>{isLoading ? <LoaderCircle className="h-4 w-4 animate-spin"/> : "No worker found."}</CommandEmpty><CommandGroup>{workers.map(c => (<CommandItem key={c.id} value={c.name} onSelect={() => { setSelectedWorkerId(c.id); setIsWorkerPopoverOpen(false); }}> <Check className={cn("mr-2 h-4 w-4", selectedWorkerId === c.id ? "opacity-100" : "opacity-0")}/>{c.name}</CommandItem>))}</CommandGroup></CommandList></Command>
                            </PopoverContent>
                        </Popover>
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
                        <Button variant="ghost" onClick={clearDates} className="w-full">Clear Date</Button>
                    </div>
                </CardContent>
                 <CardFooter>
                    <Button onClick={handleLogTimeClick} disabled={!selectedWorkerId}>
                        <Clock className="mr-2 h-4 w-4" />
                        Log a Time Entry
                    </Button>
                </CardFooter>
            </Card>

            <div ref={contentRef}>
                <Card className="print:border-none print:shadow-none">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">Time Log Report for {selectedWorker?.name || "..."}</CardTitle>
                        <CardDescription>
                            {dateRange?.from ? dateRange.to ? `${format(dateRange.from, "PPP")} to ${format(dateRange.to, "PPP")}` : `On ${format(dateRange.from, "PPP")}` : "All Time"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="h-48 flex items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin"/></div>
                        ) : selectedWorkerId ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-right">Duration</TableHead>
                                        <TableHead className="w-10 print:hidden"><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredEntries.length > 0 ? filteredEntries.map(entry => (
                                        <TableRow key={entry.id}>
                                            <TableCell>{entry.start ? format(new Date(entry.start), 'yyyy-MM-dd') : 'N/A'}</TableCell>
                                            <TableCell>{entry.title}</TableCell>
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
                                    )) : (
                                        <TableRow><TableCell colSpan={4} className="h-24 text-center">No time entries found for this worker and period.</TableCell></TableRow>
                                    )}
                                </TableBody>
                                <TableFooter>
                                    <TableRow>
                                        <TableCell colSpan={2} className="font-bold">Total Logged Time</TableCell>
                                        <TableCell className="text-right font-bold font-mono">{formatTime(totalDuration)}</TableCell>
                                        <TableCell className="print:hidden"/>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        ) : (
                            <div className="h-48 flex items-center justify-center"><p className="text-muted-foreground">Please select a worker to generate a report.</p></div>
                        )}
                    </CardContent>
                    <CardFooter className="print:hidden justify-end space-x-2">
                        <Button variant="outline" onClick={handlePrint} disabled={!selectedWorkerId}>
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
        </>
    );
}
