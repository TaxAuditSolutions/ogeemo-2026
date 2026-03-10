'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import { Badge } from '@/components/ui/badge';
import { LoaderCircle, MoreVertical, Edit, Trash2, Calendar as CalendarIcon, PlusCircle, ArrowUpDown, ArrowUpAZ, ArrowDownAZ, ArrowUpZA, FileDigit, Clock, FilterX } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { type DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getWorkers, type Worker } from '@/services/payroll-service';
import { getTimeLogs, deleteTimeLog } from '@/services/timelog-service';
import { getTasksForUser } from '@/services/project-service';
import { getContacts, type Contact } from '@/services/contact-service';
import { getUserProfile } from '@/services/user-profile-service';
import { formatTime, cn } from '@/lib/utils';
import { ReportsPageHeader } from '@/components/reports/page-header';
import { LogTimeDialog } from '@/components/reports/log-time-dialog';
import { ContactSelector } from '@/components/contacts/contact-selector';
import { Label } from '@/components/ui/label';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

function ClientTimeLogReportContent() {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [timeLogs, setTimeLogs] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [adminName, setAdminName] = useState<string>('Admin');
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const highlightedId = searchParams.get('highlight');
    
    const [isLogTimeDialogOpen, setIsLogTimeDialogOpen] = useState(false);
    const [entryToEdit, setEntryToEdit] = useState<any | null>(null);
    const [entryToDelete, setEntryToDelete] = useState<any | null>(null);
    
    const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
    const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);

    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'startTime', direction: 'desc' });

    const loadData = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const [fetchedWorkers, fetchedContacts, fetchedLogs, fetchedTasks, profile] = await Promise.all([
                getWorkers(user.uid).catch(err => { if (err.code === 'permission-denied') throw { ...err, path: 'contacts' }; throw err; }),
                getContacts().catch(err => { if (err.code === 'permission-denied') throw { ...err, path: 'contacts' }; throw err; }),
                getTimeLogs().catch(err => { if (err.code === 'permission-denied') throw { ...err, path: 'timeLogs' }; throw err; }),
                getTasksForUser().catch(err => { if (err.code === 'permission-denied') throw { ...err, path: 'tasks' }; throw err; }),
                getUserProfile(user.uid).catch(err => { if (err.code === 'permission-denied') throw { ...err, path: 'users' }; throw err; })
            ]);
            
            const name = profile?.displayName || user.displayName || user.email || 'Admin';
            setAdminName(name);

            setWorkers(fetchedWorkers);
            setContacts(fetchedContacts);
            setTimeLogs(fetchedLogs);
            setTasks(fetchedTasks.filter(t => (t.duration || 0) > 0));
        } catch (error: any) {
            if (error.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({
                    path: error.path || 'unknown',
                    operation: 'list',
                } satisfies SecurityRuleContext);
                errorEmitter.emit('permission-error', permissionError);
            }
            toast({ variant: 'destructive', title: 'Failed to load data', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (highlightedId && !isLoading) {
            const timeoutId = setTimeout(() => {
                const rowElement = document.getElementById(`row-${highlightedId}`);
                if (rowElement) {
                    rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 300);
            return () => clearTimeout(timeoutId);
        }
    }, [highlightedId, isLoading]);

    const clientEntries = useMemo(() => {
        const fromLogs = timeLogs
            .filter(tl => !!tl.contactId)
            .map(tl => {
                const worker = workers.find(w => w.id === tl.workerId);
                const contact = contacts.find(c => c.id === tl.contactId);
                
                return {
                    ...tl,
                    id: tl.id,
                    workerId: tl.workerId,
                    workerName: worker ? worker.name : (tl.workerId === user?.uid ? adminName : tl.workerName || 'Unknown'),
                    contactName: contact ? contact.name : (tl.contactName || 'Client'),
                    contactId: tl.contactId,
                    startTime: new Date(tl.startTime),
                    durationSeconds: tl.durationSeconds,
                    source: 'log',
                    isBillable: tl.isBillable || false,
                    billableRate: tl.billableRate || 0,
                    subject: tl.subject || '',
                    details: tl.notes || '',
                };
            });

        const fromTasks = tasks
            .filter(t => !!t.contactId)
            .map(t => {
                const workerId = t.workerId || user?.uid;
                const worker = workers.find(w => w.id === workerId);
                const contact = contacts.find(c => c.id === t.contactId);
                
                return {
                    ...t,
                    id: t.id,
                    workerId: workerId,
                    workerName: worker ? worker.name : (workerId === user?.uid ? adminName : 'Unknown'),
                    contactName: contact ? contact.name : 'Client',
                    contactId: t.contactId,
                    startTime: new Date(t.start),
                    durationSeconds: t.duration || 0,
                    source: 'calendar',
                    isBillable: t.isBillable || false,
                    billableRate: t.billableRate || 0,
                    subject: t.title || '',
                    details: t.description || '',
                };
            });

        let combined = [...fromLogs, ...fromTasks];

        if (selectedContactId) {
            combined = combined.filter(e => e.contactId === selectedContactId);
        }

        if (dateRange?.from) {
            const rangeEnd = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
            combined = combined.filter(e => isWithinInterval(e.startTime, { start: startOfDay(dateRange.from!), end: rangeEnd }));
        }

        if (sortConfig) {
            combined.sort((a, b) => {
                let aValue: any;
                let bValue: any;

                if (sortConfig.key === 'startTime') {
                    aValue = a.startTime.getTime();
                    bValue = b.startTime.getTime();
                } else if (sortConfig.key === 'isBillable') {
                    aValue = a.isBillable ? 1 : 0;
                    bValue = b.isBillable ? 1 : 0;
                } else {
                    aValue = String(a[sortConfig.key] || '').toLowerCase();
                    bValue = String(b[sortConfig.key] || '').toLowerCase();
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return combined;
    }, [timeLogs, tasks, workers, contacts, selectedContactId, dateRange, user, adminName, sortConfig]);

    const totalBillableDuration = useMemo(() => clientEntries.reduce((acc, e) => acc + (e.isBillable ? e.durationSeconds : 0), 0), [clientEntries]);
    const totalBillableAmount = useMemo(() => clientEntries.reduce((acc, e) => acc + (e.isBillable ? (e.durationSeconds / 3600) * (e.billableRate || 0) : 0), 0), [clientEntries]);

    const handleConfirmDelete = async () => {
        if (!entryToDelete) return;
        try {
            if (entryToDelete.source === 'log') {
                await deleteTimeLog(entryToDelete.id);
            } else {
                toast({ variant: 'destructive', title: 'Action Restricted', description: 'Calendar events must be deleted from the Calendar or Task Board.' });
                return;
            }
            toast({ title: 'Time Log Deleted' });
            loadData();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
        } finally {
            setIsLoading(false);
            setEntryToDelete(null);
        }
    };

    const handleOpenLogTimeDialog = (entry: any) => {
        setEntryToEdit(entry);
        setIsLogTimeDialogOpen(true);
    };

    const handleScheduleEvent = (entry: any) => {
        const query = new URLSearchParams({
            title: entry.subject || entry.title || '',
            notes: entry.details || entry.notes || '',
            contactId: entry.contactId || '',
        });
        router.push(`/master-mind?${query.toString()}`);
    };

    const handleCreateInvoice = (contactId: string | null) => {
        if (!contactId) return;
        router.push(`/accounting/invoices/create?contactId=${contactId}`);
    };

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const workersForSelection = useMemo(() => {
        const adminWorker: Worker = {
            id: user?.uid || '',
            name: `${adminName} (Admin)`,
            email: user?.email || '',
            workerType: 'employee',
            payType: 'salary',
            payRate: 0,
            userId: user?.uid || '',
            folderId: 'all'
        };
        return [adminWorker, ...workers];
    }, [workers, user, adminName]);

    return (
        <>
            <div className="p-4 sm:p-6 space-y-6 text-black">
                <ReportsPageHeader pageTitle="Client Time Log Report" />
                <header className="flex flex-col md:flex-row items-center justify-between gap-4 border-b pb-4">
                    <div className="text-left flex-1">
                        <h1 className="text-3xl font-bold font-headline text-primary">Client Time Log Report</h1>
                        <p className="text-muted-foreground text-sm">Detailed record of work performed for clients. Use this to prepare your Accounts Receivable invoices.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <ContactSelector
                            contacts={contacts}
                            selectedContactId={selectedContactId}
                            onSelectContact={setSelectedContactId}
                            className="w-64"
                        />
                        <Button variant="outline" size="sm" onClick={() => setIsLogTimeDialogOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" /> + Log Time Event
                        </Button>
                    </div>
                </header>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex flex-wrap items-end justify-center gap-6">
                           <div className="flex flex-col items-center space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Start Date</Label>
                                <Popover open={isStartDatePickerOpen} onOpenChange={setIsStartDatePickerOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-48 justify-start text-left font-normal px-4 bg-white", !dateRange?.from && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                            {dateRange?.from ? format(dateRange.from, "PPP") : <span>Start Date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <CustomCalendar mode="single" selected={dateRange?.from} onSelect={(date) => { if(date) { setDateRange(prev => ({ from: date, to: prev?.to })); setIsStartDatePickerOpen(false); } }} initialFocus />
                                    </PopoverContent>
                                </Popover>
                           </div>
                           <div className="flex flex-col items-center space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">End Date</Label>
                                <Popover open={isEndDatePickerOpen} onOpenChange={setIsEndDatePickerOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-48 justify-start text-left font-normal px-4 bg-white", !dateRange?.to && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                            {dateRange?.to ? format(dateRange.to, "PPP") : <span>End Date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <CustomCalendar mode="single" selected={dateRange?.to} onSelect={(date) => { if(date) { setDateRange(prev => ({ from: prev?.from, to: date })); setIsEndDatePickerOpen(false); } }} disabled={(date) => dateRange?.from ? date < dateRange.from : false} initialFocus />
                                    </PopoverContent>
                                </Popover>
                           </div>
                           <Button variant="outline" className="bg-white" onClick={() => { setSelectedContactId(null); setDateRange(undefined); }} disabled={!selectedContactId && !dateRange}>
                                <FilterX className="mr-2 h-4 w-4" /> Clear Filters
                            </Button>
                        </div>
                    </CardContent>
                    <CardContent className="p-0 border-t">
                        <div className="border-x-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="p-0">
                                            <Button variant="ghost" onClick={() => requestSort('contactName')} className="h-full w-full justify-start px-4 font-bold hover:bg-muted/50 rounded-none">
                                                Client {sortConfig?.key === 'contactName' ? (sortConfig.direction === 'asc' ? <ArrowUpAZ className="ml-2 h-4 w-4" /> : <ArrowDownAZ className="ml-2 h-4 w-4" />) : <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />}
                                            </Button>
                                        </TableHead>
                                        <TableHead className="p-0">
                                            <Button variant="ghost" onClick={() => requestSort('workerName')} className="h-full w-full justify-start px-4 font-bold hover:bg-muted/50 rounded-none">
                                                Worker {sortConfig?.key === 'workerName' ? (sortConfig.direction === 'asc' ? <ArrowUpAZ className="ml-2 h-4 w-4" /> : <ArrowDownAZ className="ml-2 h-4 w-4" />) : <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />}
                                            </Button>
                                        </TableHead>
                                        <TableHead className="p-0">
                                            <Button variant="ghost" onClick={() => requestSort('startTime')} className="h-full w-full justify-start px-4 font-bold hover:bg-muted/50 rounded-none">
                                                Date {sortConfig?.key === 'startTime' ? (sortConfig.direction === 'asc' ? <ArrowUpZA className="ml-2 h-4 w-4" /> : <ArrowDownAZ className="ml-2 h-4 w-4" />) : <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />}
                                            </Button>
                                        </TableHead>
                                        <TableHead>Subject</TableHead>
                                        <TableHead className="text-right">Duration</TableHead>
                                        <TableHead className="p-0">
                                            <Button variant="ghost" onClick={() => requestSort('isBillable')} className="h-full w-full justify-end px-4 font-bold hover:bg-muted/50 rounded-none">
                                                Billable {sortConfig?.key === 'isBillable' ? (sortConfig.direction === 'asc' ? <ArrowUpAZ className="ml-2 h-4 w-4" /> : <ArrowDownAZ className="ml-2 h-4 w-4" />) : <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />}
                                            </Button>
                                        </TableHead>
                                        <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow><TableCell colSpan={7} className="text-center h-24"><LoaderCircle className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                                    ) : clientEntries.length > 0 ? (
                                        clientEntries.map(entry => (
                                            <TableRow key={entry.id} id={`row-${entry.id}`} className={cn(highlightedId === entry.id && "bg-primary/10 animate-pulse ring-2 ring-primary ring-inset")}>
                                                <TableCell className="font-medium">{entry.contactName}</TableCell>
                                                <TableCell>{entry.workerName}</TableCell>
                                                <TableCell>{format(entry.startTime, 'yyyy-MM-dd')}</TableCell>
                                                <TableCell className="max-w-xs truncate">{entry.subject || entry.title}</TableCell>
                                                <TableCell className="text-right font-mono">{formatTime(entry.durationSeconds)}</TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {entry.isBillable ? formatCurrency((entry.durationSeconds / 3600) * (entry.billableRate || 0)) : '-'}
                                                </TableCell>
                                                <TableCell>
                                                     <DropdownMenu>
                                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onSelect={() => handleScheduleEvent(entry)}>
                                                                <Clock className="mr-2 h-4 w-4" /> Schedule an event
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onSelect={() => handleCreateInvoice(entry.contactId)}>
                                                                <FileDigit className="mr-2 h-4 w-4" /> Create Invoice
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            {entry.source === 'log' ? (
                                                                <>
                                                                    <DropdownMenuItem onSelect={() => handleOpenLogTimeDialog(entry)}><Edit className="mr-2 h-4 w-4" /> Edit Details</DropdownMenuItem>
                                                                    <DropdownMenuItem onSelect={() => setEntryToDelete(entry)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                                                                </>
                                                            ) : (
                                                                <DropdownMenuItem onSelect={() => router.push(`/master-mind?eventId=${entry.id}`)}><Edit className="mr-2 h-4 w-4" /> Edit Details</DropdownMenuItem>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={7} className="text-center h-24 text-muted-foreground">No client-attributed entries found.</TableCell></TableRow>
                                    )}
                                </TableBody>
                                {clientEntries.length > 0 && (
                                    <TableFooter>
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-right font-bold">Billable Totals:</TableCell>
                                            <TableCell className="text-right font-bold font-mono">{formatTime(totalBillableDuration)}</TableCell>
                                            <TableCell className="text-right font-bold font-mono text-primary">{formatCurrency(totalBillableAmount)}</TableCell>
                                            <TableCell />
                                        </TableRow>
                                    </TableFooter>
                                )}
                            </Table>
                        </div>
                    </CardContent>
                    {selectedContactId && clientEntries.length > 0 && (
                        <CardFooter className="justify-end border-t p-4">
                            <Button onClick={() => handleCreateInvoice(selectedContactId)}>
                                <FileDigit className="mr-2 h-4 w-4" />
                                Create Invoice for {contacts.find(c => c.id === selectedContactId)?.name}
                            </Button>
                        </CardFooter>
                    )}
                </Card>
            </div>
            
            <LogTimeDialog 
                isOpen={isLogTimeDialogOpen} 
                onOpenChange={(isOpen) => {
                    setIsLogTimeDialogOpen(isOpen);
                    if (!isOpen) {
                        setEntryToEdit(null);
                    }
                }}
                workers={workersForSelection}
                onTimeLogged={loadData}
                entryToEdit={entryToEdit}
            />
            
            <AlertDialog open={!!entryToDelete} onOpenChange={() => setEntryToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this time log entry.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

export default function ClientTimeLogReportPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><LoaderCircle className="h-10 w-10 animate-spin text-primary" /></div>}>
      <ClientTimeLogReportContent />
    </Suspense>
  );
}