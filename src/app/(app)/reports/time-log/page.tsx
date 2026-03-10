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
import { 
    LoaderCircle, 
    MoreVertical, 
    Edit, 
    Trash2, 
    FilterX, 
    Calendar as CalendarIcon, 
    PlusCircle, 
    Clock, 
    Pencil, 
    ArrowUpDown, 
    ArrowUpAZ, 
    ArrowDownAZ, 
    ArrowUpZA,
    Files,
    ExternalLink
} from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getWorkers, deleteWorker, type Worker } from '@/services/payroll-service';
import { getTimeLogs, deleteTimeLog } from '@/services/timelog-service';
import { getTasksForUser } from '@/services/project-service';
import { getContacts, type Contact } from '@/services/contact-service';
import { getUserProfile } from '@/services/user-profile-service';
import { formatTime, cn, formatCurrency } from '@/lib/utils';
import { ReportsPageHeader } from '@/components/reports/page-header';
import { LogTimeDialog } from '@/components/reports/log-time-dialog';
import { WorkerSelector } from '@/components/reports/WorkerSelector';
import type { DateRange } from 'react-day-picker';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import Link from 'next/link';

function WorkerTimeLogReportContent() {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [timeLogs, setTimeLogs] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [adminName, setAdminName] = useState<string>('Admin');
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    
    const [isLogTimeDialogOpen, setIsLogTimeDialogOpen] = useState(false);
    const [entryToEdit, setEntryToEdit] = useState<any | null>(null);
    const [entryToDelete, setEntryToDelete] = useState<any | null>(null);
    const [preselectedWorkerId, setPreselectedWorkerId] = useState<string | null>(null);
    
    const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
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

    const allMergedEntries = useMemo(() => {
        const fromLogs = timeLogs.map(tl => {
            const worker = workers.find(w => w.id === tl.workerId);
            const contact = contacts.find(c => c.id === tl.contactId);
            
            return {
                ...tl,
                id: tl.id,
                workerId: tl.workerId,
                workerName: worker ? worker.name : (tl.workerId === user?.uid ? adminName : tl.workerName || 'Unknown'),
                contactName: contact ? contact.name : 'Internal',
                startTime: new Date(tl.startTime),
                durationSeconds: tl.durationSeconds,
                source: 'log',
                isBillable: tl.isBillable || false,
                billableRate: tl.billableRate || 0,
                notes: tl.notes || tl.description || tl.subject || '',
                documentFolderId: worker?.documentFolderId,
            };
        });

        const fromTasks = tasks.map(t => {
            const workerId = t.workerId || user?.uid;
            const worker = workers.find(w => w.id === workerId);
            const contact = contacts.find(c => c.id === t.contactId);
            
            return {
                ...t,
                id: t.id,
                workerId: workerId,
                workerName: worker ? worker.name : (workerId === user?.uid ? adminName : 'Unknown'),
                contactName: contact ? contact.name : 'Internal',
                startTime: new Date(t.start),
                durationSeconds: t.duration || 0,
                source: 'calendar',
                isBillable: t.isBillable || false,
                billableRate: t.billableRate || 0,
                notes: t.description || t.title || '',
                documentFolderId: worker?.documentFolderId,
            };
        });

        let combined = [...fromLogs, ...fromTasks];

        if (selectedWorkerId) {
            combined = combined.filter(e => e.workerId === selectedWorkerId);
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
    }, [timeLogs, tasks, workers, contacts, selectedWorkerId, dateRange, user, adminName, sortConfig]);

    const totalDurationSeconds = useMemo(() => allMergedEntries.reduce((acc, e) => acc + e.durationSeconds, 0), [allMergedEntries]);
    const billableDurationSeconds = useMemo(() => allMergedEntries.reduce((acc, e) => acc + (e.isBillable ? e.durationSeconds : 0), 0), [allMergedEntries]);
    const totalBillableAmount = useMemo(() => allMergedEntries.reduce((acc, e) => acc + (e.isBillable ? (e.durationSeconds / 3600) * (e.billableRate || 0) : 0), 0), [allMergedEntries]);

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

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
            title: entry.title || entry.subject || '',
            notes: entry.notes || entry.details || entry.description || '',
            contactId: entry.contactId || '',
        });
        router.push(`/master-mind?${query.toString()}`);
    };

    const workersForSelection = useMemo(() => {
        const adminContact = contacts.find(c => c.userId === user?.uid);
        
        const adminWorker: Worker = adminContact ? { ...adminContact, name: `${adminContact.name} (Admin)` } : {
            id: user?.uid || '',
            name: `${adminName} (Admin)`,
            email: user?.email || '',
            workerType: 'employee',
            payType: 'salary',
            payRate: 0, 
            userId: user?.uid || '',
            folderId: 'all'
        };

        const seen = new Set([adminWorker.id]);
        const filteredWorkers = workers.filter(w => {
            if (seen.has(w.id)) return false;
            seen.add(w.id);
            return true;
        });
        return [adminWorker, ...filteredWorkers];
    }, [workers, contacts, user, adminName]);

    const selectedWorker = workersForSelection.find(w => w.id === selectedWorkerId);

    return (
        <>
            <div className="p-4 sm:p-6 space-y-6 text-black">
                <ReportsPageHeader pageTitle="Time Log Report" hubPath="/hr-manager" hubLabel="HR Hub" />
                <header className="flex flex-col md:flex-row items-center justify-between gap-4 border-b pb-4">
                    <div className="text-left flex-1">
                        <h1 className="text-3xl font-bold font-headline text-primary">Time Log Report</h1>
                        <p className="text-muted-foreground text-sm">Review and manage work sessions. Attribution shows who did the work and which client was served.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <div className="flex items-center gap-2">
                            <WorkerSelector
                                workers={workersForSelection}
                                selectedWorkerId={selectedWorkerId}
                                onSelect={setSelectedWorkerId}
                                isLoading={isLoading}
                            />
                            {selectedWorker?.documentFolderId && (
                                <Button variant="outline" size="sm" asChild className="h-10">
                                    <Link href={`/document-manager?highlight=${selectedWorker.documentFolderId}`}>
                                        <Files className="mr-2 h-4 w-4" /> Documents
                                    </Link>
                                </Button>
                            )}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setIsLogTimeDialogOpen(true)} className="h-10">
                            <PlusCircle className="mr-2 h-4 w-4" /> + Log Time Event
                        </Button>
                    </div>
                </header>

                <Card>
                    <CardHeader className="p-4 bg-muted/30">
                        <div className="flex flex-wrap items-end justify-center gap-6">
                           <div className="flex flex-col items-center space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Start Date</Label>
                                <Popover open={isStartDatePickerOpen} onOpenChange={setIsStartDatePickerOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-48 justify-start text-left font-normal px-4 bg-white", !dateRange?.from && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                            {dateRange?.from ? format(dateRange.from, "PPP") : <span>Beginning of time</span>}
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
                                            {dateRange?.to ? format(dateRange.to, "PPP") : <span>End of time</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <CustomCalendar mode="single" selected={dateRange?.to} onSelect={(date) => { if(date) { setDateRange(prev => ({ from: prev?.from, to: date })); setIsEndDatePickerOpen(false); } }} initialFocus disabled={(date) => dateRange?.from ? date < dateRange.from : false} />
                                    </PopoverContent>
                                </Popover>
                           </div>
                           <Button variant="outline" className="bg-white" onClick={() => { setSelectedWorkerId(null); setDateRange(undefined); }} disabled={!selectedWorkerId && !dateRange}>
                                <FilterX className="mr-2 h-4 w-4" /> Clear Filters
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 border-t">
                        <div className="border-x-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="p-0">
                                            <Button variant="ghost" onClick={() => requestSort('workerName')} className="h-full w-full justify-start px-4 font-bold hover:bg-muted/50 rounded-none">
                                                Worker {sortConfig?.key === 'workerName' ? (sortConfig.direction === 'asc' ? <ArrowUpAZ className="ml-2 h-4 w-4" /> : <ArrowDownAZ className="ml-2 h-4 w-4" />) : <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />}
                                            </Button>
                                        </TableHead>
                                        <TableHead className="p-0">
                                            <Button variant="ghost" onClick={() => requestSort('contactName')} className="h-full w-full justify-start px-4 font-bold hover:bg-muted/50 rounded-none">
                                                Client {sortConfig?.key === 'contactName' ? (sortConfig.direction === 'asc' ? <ArrowUpAZ className="ml-2 h-4 w-4" /> : <ArrowDownAZ className="ml-2 h-4 w-4" />) : <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />}
                                            </Button>
                                        </TableHead>
                                        <TableHead className="p-0">
                                            <Button variant="ghost" onClick={() => requestSort('startTime')} className="h-full w-full justify-start px-4 font-bold hover:bg-muted/50 rounded-none">
                                                Date {sortConfig?.key === 'startTime' ? (sortConfig.direction === 'asc' ? <ArrowUpZA className="ml-2 h-4 w-4" /> : <ArrowDownAZ className="ml-2 h-4 w-4" />) : <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />}
                                            </Button>
                                        </TableHead>
                                        <TableHead className="p-0">
                                            <Button variant="ghost" onClick={() => requestSort('isBillable')} className="h-full w-full justify-start px-4 font-bold hover:bg-muted/50 rounded-none">
                                                Billing {sortConfig?.key === 'isBillable' ? (sortConfig.direction === 'asc' ? <ArrowUpAZ className="ml-2 h-4 w-4" /> : <ArrowDownAZ className="ml-2 h-4 w-4" />) : <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />}
                                            </Button>
                                        </TableHead>
                                        <TableHead>Notes</TableHead>
                                        <TableHead className="text-right">Duration</TableHead>
                                        <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow><TableCell colSpan={7} className="text-center h-24"><LoaderCircle className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                                    ) : allMergedEntries.length > 0 ? (
                                        allMergedEntries.map(entry => (
                                            <TableRow key={entry.id}>
                                                <TableCell className="font-medium">{entry.workerName}</TableCell>
                                                <TableCell>{entry.contactName}</TableCell>
                                                <TableCell>{format(entry.startTime, 'yyyy-MM-dd')}</TableCell>
                                                <TableCell>
                                                    <Badge variant={entry.isBillable ? "default" : "secondary"}>
                                                        {entry.isBillable ? `Billable (${formatCurrency(entry.billableRate)}/hr)` : 'Non-Billable'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="max-w-xs truncate">{entry.notes}</TableCell>
                                                <TableCell className="text-right font-mono">{formatTime(entry.durationSeconds)}</TableCell>
                                                <TableCell>
                                                     <DropdownMenu>
                                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onSelect={() => handleScheduleEvent(entry)}>
                                                                <Clock className="mr-2 h-4 w-4" /> Schedule an event
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem 
                                                                onSelect={() => router.push(`/document-manager?highlight=${entry.documentFolderId}`)}
                                                                disabled={!entry.documentFolderId}
                                                            >
                                                                <Files className="mr-2 h-4 w-4" /> View Worker Documents
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            {entry.source === 'log' ? (
                                                                <>
                                                                    <DropdownMenuItem onSelect={() => handleOpenLogTimeDialog(entry)}><Pencil className="mr-2 h-4 w-4" /> Edit Details</DropdownMenuItem>
                                                                    <DropdownMenuItem onSelect={() => setEntryToDelete(entry)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                                                                </>
                                                            ) : (
                                                                <DropdownMenuItem onSelect={() => router.push(`/master-mind?eventId=${entry.id}`)}><Edit className="mr-2 h-4 w-4" /> Edit in Scheduler</DropdownMenuItem>
                                                            )}
                                                        </DropdownMenuContent>
                                                     </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={7} className="text-center h-24 text-muted-foreground">No entries found for the current selection.</TableCell></TableRow>
                                    )}
                                </TableBody>
                                {allMergedEntries.length > 0 && (
                                    <TableFooter>
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-right font-bold">Total Hours (All Entries):</TableCell>
                                            <TableCell className="text-right font-bold font-mono">{formatTime(totalDurationSeconds)}</TableCell>
                                            <TableCell />
                                        </TableRow>
                                        <TableRow className="bg-muted/30">
                                            <TableCell colSpan={5} className="text-right font-semibold">Billable Hours Only:</TableCell>
                                            <TableCell className="text-right font-semibold font-mono text-primary">{formatTime(billableDurationSeconds)}</TableCell>
                                            <TableCell />
                                        </TableRow>
                                        <TableRow className="text-lg bg-primary/5">
                                            <TableCell colSpan={5} className="text-right font-bold text-primary">Total Billable Amount (to Client):</TableCell>
                                            <TableCell className="text-right font-bold font-mono text-primary">{formatCurrency(totalBillableAmount)}</TableCell>
                                            <TableCell />
                                        </TableRow>
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
                workers={workersForSelection}
                onTimeLogged={loadData}
                entryToEdit={entryToEdit}
                preselectedWorkerId={preselectedWorkerId}
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

export default function WorkerTimeLogReportPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><LoaderCircle className="h-10 w-10 animate-spin text-primary" /></div>}>
      <WorkerTimeLogReportContent />
    </Suspense>
  );
}
