
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  DropdownMenuTrigger,
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
} from '@/components/ui/alert-dialog';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, MoreVertical, Check, ThumbsUp, ThumbsDown, MessageSquare, LoaderCircle, ChevronsUpDown, CalendarIcon } from 'lucide-react';
import { format, set, startOfDay } from 'date-fns';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getWorkers, type Worker } from '@/services/payroll-service';
import { getLeaveRequests, addLeaveRequest, updateLeaveRequest, type LeaveRequest } from '@/services/leave-service';
import { addTask } from '@/services/project-service';
import { AccountingPageHeader } from '@/components/accounting/page-header';
import { cn } from '@/lib/utils';


const LeaveTypeBadge = ({ type }: { type: string }) => {
    const colorMap: Record<string, string> = {
        'Vacation': 'bg-blue-100 text-blue-800',
        'Sick': 'bg-orange-100 text-orange-800',
        'Personal': 'bg-purple-100 text-purple-800',
        'Unpaid': 'bg-gray-100 text-gray-800',
    };
    return <Badge className={cn("capitalize", colorMap[type] || 'bg-gray-100 text-gray-800')}>{type}</Badge>;
};

const StatusBadge = ({ status }: { status: string }) => {
    const colorMap: Record<string, string> = {
        'Pending': 'bg-yellow-100 text-yellow-800',
        'Approved': 'bg-green-100 text-green-800',
        'Denied': 'bg-red-100 text-red-800',
    };
    return <Badge className={cn("capitalize", colorMap[status] || 'bg-gray-100 text-gray-800')}>{status}</Badge>;
};


export default function TimeOffPage() {
    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<LeaveRequest>>({ leaveType: 'Vacation', status: 'Pending' });
    const [isWorkerPopoverOpen, setIsWorkerPopoverOpen] = useState(false);
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();
    const [isStartPopoverOpen, setIsStartPopoverOpen] = useState(false);
    const [isEndPopoverOpen, setIsEndPopoverOpen] = useState(false);

    const [requestToUpdate, setRequestToUpdate] = useState<{ request: LeaveRequest, newStatus: 'Approved' | 'Denied' } | null>(null);
    const [adminNotes, setAdminNotes] = useState('');

    const { user } = useAuth();
    const { toast } = useToast();

    const loadData = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const [fetchedRequests, fetchedWorkers] = await Promise.all([
                getLeaveRequests(user.uid),
                getWorkers(user.uid),
            ]);
            setRequests(fetchedRequests);
            setWorkers(fetchedWorkers);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to load data', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const handleOpenForm = () => {
        setFormData({ leaveType: 'Vacation', status: 'Pending' });
        setStartDate(undefined);
        setEndDate(undefined);
        setIsFormOpen(true);
    };

    const handleSaveRequest = async () => {
        if (!user || !formData.workerId || !startDate || !endDate) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select a worker and both start and end dates.'});
            return;
        }
        if (endDate < startDate) {
            toast({ variant: 'destructive', title: 'Invalid Dates', description: 'End date cannot be before the start date.'});
            return;
        }

        const worker = workers.find(w => w.id === formData.workerId);
        if (!worker) {
            toast({ variant: 'destructive', title: 'Invalid Worker', description: 'Selected worker could not be found.'});
            return;
        }

        const newRequestData: Omit<LeaveRequest, 'id'> = {
            userId: user.uid,
            workerId: worker.id,
            workerName: worker.name,
            leaveType: formData.leaveType || 'Personal',
            startDate: format(startDate, 'yyyy-MM-dd'),
            endDate: format(endDate, 'yyyy-MM-dd'),
            reason: formData.reason || '',
            status: 'Pending',
        };
        
        try {
            const newRequest = await addLeaveRequest(newRequestData);
            setRequests(prev => [newRequest, ...prev]);
            toast({ title: 'Request Submitted' });
            setIsFormOpen(false);
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Submission Failed', description: error.message });
        }
    };
    
    const handleUpdateStatus = async () => {
        if (!requestToUpdate || !user) return;
        
        try {
            const { request, newStatus } = requestToUpdate;
            await updateLeaveRequest(request.id, { status: newStatus, adminNotes });
            
            if (newStatus === 'Approved') {
                const calendarEventData = {
                    title: `${request.leaveType}: ${request.workerName}`,
                    start: startOfDay(new Date(request.startDate)),
                    end: startOfDay(addDays(new Date(request.endDate), 1)), // Make it an all-day event for the range
                    status: 'done' as const, // The leave itself is 'done' once approved
                    isScheduled: true,
                    isBillable: false,
                    workerId: request.workerId,
                    userId: user.uid,
                    position: 0,
                    description: `Approved time off. Reason: ${request.reason || 'N/A'}`
                };
                await addTask(calendarEventData);
            }
            
            setRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: newStatus, adminNotes } : r));
            toast({ title: 'Request Updated', description: `The request has been ${newStatus.toLowerCase()}.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
        } finally {
            setRequestToUpdate(null);
            setAdminNotes('');
        }
    };

    return (
        <>
        <div className="p-4 sm:p-6 space-y-6">
            <AccountingPageHeader pageTitle="Time Off &amp; Leave" hubPath="/hr-manager" hubLabel="HR Hub" />
            <header className="text-center">
                <h1 className="text-3xl font-bold font-headline text-primary">Time Off &amp; Leave Management</h1>
                <p className="text-muted-foreground">Review, approve, and manage all worker time off requests.</p>
            </header>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Leave Requests</CardTitle>
                        <CardDescription>All pending, approved, and denied time off requests.</CardDescription>
                    </div>
                    <Button variant="outline" onClick={handleOpenForm}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Request Time Off
                    </Button>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="h-64 flex items-center justify-center">
                            <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Worker</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Dates</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {requests.map(req => (
                                <TableRow key={req.id}>
                                    <TableCell className="font-medium">{req.workerName}</TableCell>
                                    <TableCell><LeaveTypeBadge type={req.leaveType} /></TableCell>
                                    <TableCell>{format(new Date(req.startDate), 'PP')} - {format(new Date(req.endDate), 'PP')}</TableCell>
                                    <TableCell><StatusBadge status={req.status} /></TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem disabled={req.status !== 'Pending'} onSelect={() => setRequestToUpdate({ request: req, newStatus: 'Approved'})}>
                                                    <ThumbsUp className="mr-2 h-4 w-4 text-green-600"/> Approve
                                                </DropdownMenuItem>
                                                <DropdownMenuItem disabled={req.status !== 'Pending'} onSelect={() => setRequestToUpdate({ request: req, newStatus: 'Denied'})}>
                                                    <ThumbsDown className="mr-2 h-4 w-4 text-red-600"/> Deny
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
        
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>Request Time Off</DialogTitle></DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label>Worker</Label>
                         <Popover open={isWorkerPopoverOpen} onOpenChange={setIsWorkerPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full justify-between">
                                    {formData.workerId ? workers.find(w => w.id === formData.workerId)?.name : 'Select worker...'}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command><CommandInput placeholder="Search workers..." /><CommandList><CommandEmpty>No worker found.</CommandEmpty><CommandGroup>{workers.map(w => (<CommandItem key={w.id} value={w.name} onSelect={() => { setFormData(p => ({...p, workerId: w.id})); setIsWorkerPopoverOpen(false); }}> <Check className={cn("mr-2 h-4 w-4", formData.workerId === w.id ? "opacity-100" : "opacity-0")}/>{w.name}</CommandItem>))}</CommandGroup></CommandList></Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                     <div className="space-y-2">
                        <Label>Leave Type</Label>
                        <Select value={formData.leaveType} onValueChange={(value) => setFormData(p => ({...p, leaveType: value}))}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Vacation">Vacation</SelectItem>
                                <SelectItem value="Sick">Sick Leave</SelectItem>
                                <SelectItem value="Personal">Personal Day</SelectItem>
                                <SelectItem value="Unpaid">Unpaid Leave</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Popover open={isStartPopoverOpen} onOpenChange={setIsStartPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={startDate} onSelect={(d) => { setStartDate(d); setIsStartPopoverOpen(false); }} initialFocus />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label>End Date</Label>
                             <Popover open={isEndPopoverOpen} onOpenChange={setIsEndPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={endDate} onSelect={(d) => { setEndDate(d); setIsEndPopoverOpen(false); }} disabled={(date) => startDate ? date < startDate : false} initialFocus />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label>Reason (Optional)</Label>
                        <Textarea value={formData.reason || ''} onChange={e => setFormData(p => ({...p, reason: e.target.value}))} placeholder="Provide a brief reason for your request..." />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveRequest}>Submit Request</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        <AlertDialog open={!!requestToUpdate} onOpenChange={() => setRequestToUpdate(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Action</AlertDialogTitle>
                    <AlertDialogDescription>
                        You are about to {requestToUpdate?.newStatus.toLowerCase()} this request. You can add an optional note for the worker.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                    <Label htmlFor="admin-notes">Administrator Notes</Label>
                    <Textarea id="admin-notes" value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="e.g., Approved, have a great time!"/>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleUpdateStatus}>Confirm {requestToUpdate?.newStatus}</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    );
}
