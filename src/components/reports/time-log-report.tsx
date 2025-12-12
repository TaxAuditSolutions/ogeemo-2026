
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
import { ArrowLeft, LoaderCircle, ChevronsUpDown, Check, Printer, Calendar as CalendarIcon, MoreVertical, Pencil, Trash2, BookOpen, FileDigit, Info, Clock, Filter } from 'lucide-react';
import { format, startOfMonth, startOfYear } from 'date-fns';
import { type DateRange } from "react-day-picker";
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useReactToPrint } from '@/hooks/use-react-to-print';
import { getContacts, type Contact } from '@/services/contact-service';
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ReportsPageHeader } from './page-header';

const INVOICE_FROM_REPORT_KEY = 'invoiceFromReportData';

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
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [allEntries, setAllEntries] = useState<TaskEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [isContactPopoverOpen, setIsContactPopoverOpen] = useState(false);
    
    const [taskToEdit, setTaskToEdit] = useState<TaskEvent | null>(null);
    const [entryToDelete, setEntryToDelete] = useState<TaskEvent | null>(null);

    const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);

    const { user } = useAuth();
    const { toast } = useToast();
    const { handlePrint, contentRef } = useReactToPrint();
    const router = useRouter();

    useEffect(() => {
        async function loadData() {
            if (!user) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                const [accounts, entries] = await Promise.all([
                    getContacts(user.uid),
                    getTasksForUser(user.uid),
                ]);
                setContacts(accounts);
                setAllEntries(entries);
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Failed to load data', description: error.message });
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [user, toast]);
    
    const filteredEntries = useMemo(() => {
        if (!selectedContactId) return [];
        
        return allEntries
            .filter(entry => entry.contactId === selectedContactId && entry.isBillable && (entry.duration || 0) > 0)
            .filter(entry => {
                if (!dateRange || !dateRange.from || !entry.start) return true;
                const entryDate = new Date(entry.start);
                const toDate = dateRange.to || dateRange.from;
                return entryDate >= dateRange.from && entryDate <= endOfDay(toDate);
            });
    }, [selectedContactId, allEntries, dateRange]);

    const totalDuration = useMemo(() => filteredEntries.reduce((acc, entry) => acc + (entry.duration || 0), 0), [filteredEntries]);
    const totalBillable = useMemo(() => filteredEntries.reduce((acc, entry) => acc + ((entry.duration || 0) / 3600) * (entry.billableRate || 0), 0), [filteredEntries]);
    
    const setMonthToDate = () => setDateRange({ from: startOfMonth(new Date()), to: new Date() });
    
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
    
    const selectedContact = contacts.find(c => c.id === selectedContactId);

    return (
        <>
            <div className="p-4 sm:p-6 space-y-6">
                 <header className="text-center">
                    <div className="flex items-center justify-center gap-2">
                        <h1 className="text-3xl font-bold font-headline text-primary">Time Log Report</h1>
                        <Button variant="ghost" size="icon" onClick={() => setIsInfoDialogOpen(true)}>
                            <Info className="h-5 w-5 text-muted-foreground" />
                            <span className="sr-only">About this report</span>
                        </Button>
                    </div>
                  <p className="text-muted-foreground">This report shows all time & events that are logged against time and events within the filtered range.</p>
                </header>

                <Card className="print:hidden">
                    <CardHeader>
                        <CardTitle>Select a Client & Date Range</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Client</Label>
                            <Popover open={isContactPopoverOpen} onOpenChange={setIsContactPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" className="w-full justify-between">
                                        {selectedContact?.name || "Select client..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command><CommandInput placeholder="Search clients..." /><CommandList><CommandEmpty>{isLoading ? <LoaderCircle className="h-4 w-4 animate-spin"/> : "No client found."}</CommandEmpty><CommandGroup>{contacts.map(c => (<CommandItem key={c.id} value={c.name} onSelect={() => { setSelectedContactId(c.id); setIsContactPopoverOpen(false); }}> <Check className={cn("mr-2 h-4 w-4", selectedContactId === c.id ? "opacity-100" : "opacity-0")}/>{c.name}</CommandItem>))}</CommandGroup></CommandList></Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label>Date Range</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateRange?.from ? dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y") : <span>All Time</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2}/></PopoverContent>
                            </Popover>
                        </div>
                        <div className="flex items-end gap-2">
                            <Button variant="secondary" onClick={setMonthToDate} className="w-full">Month to Date</Button>
                            <Button variant="ghost" onClick={() => setDateRange(undefined)} className="w-full">Clear Date</Button>
                        </div>
                    </CardContent>
                </Card>

                <div ref={contentRef}>
                    <Card className="print:border-none print:shadow-none">
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl">{selectedContact?.name || "Client"} - Billable Time Report</CardTitle>
                            <CardDescription>
                                {dateRange?.from ? dateRange.to ? `${format(dateRange.from, "PPP")} to ${format(dateRange.to, "PPP")}` : `On ${format(dateRange.from, "PPP")}` : "All Time"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="h-48 flex items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin"/></div>
                            ) : selectedContactId ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Subject</TableHead>
                                            <TableHead className="text-right">Duration</TableHead>
                                            <TableHead className="text-right">Billable Amount</TableHead>
                                            <TableHead className="w-10 print:hidden"><span className="sr-only">Actions</span></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredEntries.length > 0 ? filteredEntries.map(entry => (
                                            <TableRow key={entry.id}>
                                                <TableCell>{entry.start ? format(new Date(entry.start), 'yyyy-MM-dd') : 'N/A'}</TableCell>
                                                <TableCell>{entry.title}</TableCell>
                                                <TableCell className="text-right font-mono">{formatTime(entry.duration || 0)}</TableCell>
                                                <TableCell className="text-right font-mono">${(((entry.duration || 0) / 3600) * (entry.billableRate || 0)).toFixed(2)}</TableCell>
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
                                            <TableRow><TableCell colSpan={5} className="h-24 text-center">No billable time entries found for this client and period.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                    <TableFooter>
                                        <TableRow>
                                            <TableCell colSpan={2} className="font-bold">Totals</TableCell>
                                            <TableCell className="text-right font-bold font-mono">{formatTime(totalDuration)}</TableCell>
                                            <TableCell className="text-right font-bold font-mono">${totalBillable.toFixed(2)}</TableCell>
                                            <TableCell className="print:hidden"/>
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            ) : (
                                <div className="h-48 flex items-center justify-center"><p className="text-muted-foreground">Please select a client to generate a report.</p></div>
                            )}
                        </CardContent>
                        <CardFooter className="print:hidden justify-end space-x-2">
                            <Button asChild variant="secondary">
                              <Link href="/accounting/invoices/create">
                                <FileDigit className="mr-2 h-4 w-4" />
                                Go to Invoicing
                              </Link>
                            </Button>
                            <Button variant="outline" onClick={handlePrint} disabled={!selectedContactId}>
                                <Printer className="mr-2 h-4 w-4" />
                                Print Report
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>

            <Dialog open={!!taskToEdit} onOpenChange={() => setTaskToEdit(null)}>
              {/* This dialog's content would need to be built out for editing */}
              <DialogContent>
                <DialogHeader><DialogTitle>Edit Log Entry</DialogTitle></DialogHeader>
                <p>Editing functionality for "{taskToEdit?.title}" would be here.</p>
                <DialogFooter><Button onClick={() => setTaskToEdit(null)}>Close</Button></DialogFooter>
              </DialogContent>
            </Dialog>

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
            
            <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
              <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                      <DialogTitle>About the Time Log Report</DialogTitle>
                      <DialogDescription>
                          This report is a powerful tool to understand where your time is going. Here's how to use it.
                      </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                      <div className="flex items-start gap-4">
                          <Clock className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                          <div>
                              <h4 className="font-semibold">What it Shows</h4>
                              <p className="text-sm text-muted-foreground">This report gathers every task that has time logged against it in the Task & Event Manager. It calculates billable amounts based on the duration and the hourly rate you set for each task.</p>
                          </div>
                      </div>
                      <div className="flex items-start gap-4">
                          <Filter className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                          <div>
                              <h4 className="font-semibold">How to Filter</h4>
                              <p className="text-sm text-muted-foreground">Use the filters at the top to narrow your results. You can view all time, just billable, or just non-billable hours. You can also filter by date range, one or more clients, and one or more projects to see exactly the data you need.</p>
                          </div>
                      </div>
                      <div className="flex items-start gap-4">
                          <FileDigit className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                          <div>
                              <h4 className="font-semibold">Creating Invoices</h4>
                              <p className="text-sm text-muted-foreground">After filtering for a specific client and date range, use the "Create Invoice from Report" button to automatically generate an invoice with all the displayed time entries pre-filled as line items.</p>
                          </div>
                      </div>
                  </div>
                  <DialogFooter>
                      <Button onClick={() => setIsInfoDialogOpen(false)}>Got it</Button>
                  </DialogFooter>
              </DialogContent>
            </Dialog>
        </>
    );
}
