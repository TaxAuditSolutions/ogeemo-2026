'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import {
    LoaderCircle, ArrowLeft, Calendar, User, CheckCircle, FileDigit, Clock,
    PlayCircle, XCircle, Briefcase
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import {
    getWorkOrderById,
    getWorkOrderLineItems,
    updateWorkOrderStatus,
    updateWorkOrderWithLineItems,
    convertWorkOrderToInvoice,
    type WorkOrder,
    type WorkOrderLineItem,
    type WorkOrderStatus,
} from '@/core/accounting-service';
import { getWorkers, type Worker } from '@/services/payroll-service';
import { addTask } from '@/services/project-service';
import { type Event as TaskEvent } from '@/types/calendar-types';
import { AccountingPageHeader } from './page-header';
import { cn } from '@/lib/utils';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

const statusConfig: Record<WorkOrderStatus, { label: string; color: string; icon: React.ElementType }> = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
    scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Calendar },
    in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: PlayCircle },
    completed: { label: 'Completed', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
};

export function WorkOrderDetailView() {
    const router = useRouter();
    const params = useParams();
    const workOrderId = params.id as string;

    const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
    const [lineItems, setLineItems] = useState<WorkOrderLineItem[]>([]);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
    const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    const { user } = useAuth();
    const { toast } = useToast();

    const loadData = useCallback(async () => {
        if (!user || !workOrderId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const [wo, items, fetchedWorkers] = await Promise.all([
                getWorkOrderById(workOrderId),
                getWorkOrderLineItems(user.uid, workOrderId),
                getWorkers(user.uid).catch(() => []),
            ]);
            setWorkOrder(wo);
            setLineItems(items);
            setWorkers(fetchedWorkers);
            if (wo) {
                setScheduledDate(wo.scheduledDate ? new Date(wo.scheduledDate) : undefined);
                setSelectedWorkerId(wo.assignedWorkerId || null);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Load Failed', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [user, workOrderId, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSchedule = async () => {
        if (!user || !workOrder || !scheduledDate) return;
        setIsUpdating(true);
        try {
            const selectedWorker = workers.find(w => w.id === selectedWorkerId);
            const taskData: Omit<TaskEvent, 'id'> = {
                title: `${workOrder.workOrderNumber} - ${workOrder.companyName}`,
                description: workOrder.notes || `Work order scheduled for ${workOrder.companyName}`,
                start: scheduledDate,
                end: new Date(scheduledDate.getTime() + 2 * 60 * 60 * 1000),
                status: 'todo',
                position: 0,
                projectId: null,
                stepId: null,
                userId: user.uid,
                attendees: [],
                contactId: workOrder.contactId,
                workerId: selectedWorkerId || undefined,
                isScheduled: true,
                isTodoItem: false,
                workOrderId: workOrder.id,
            };
            await addTask(taskData);

            await updateWorkOrderWithLineItems(workOrder.id, {
                status: 'scheduled',
                scheduledDate: scheduledDate,
                assignedWorkerId: selectedWorkerId,
                assignedWorkerName: selectedWorker?.name || '',
            }, [], user.uid);

            toast({ title: 'Work Order Scheduled', description: `Calendar task created for ${format(scheduledDate, 'PPP')}.` });
            loadData();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Schedule Failed', description: error.message });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleStartWork = async () => {
        if (!user || !workOrder) return;
        setIsUpdating(true);
        try {
            await updateWorkOrderStatus(workOrder.id, 'in_progress', user.uid);
            toast({ title: 'Work Started', description: 'Work order is now in progress.' });
            loadData();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleComplete = async () => {
        if (!user || !workOrder) return;
        setIsUpdating(true);
        try {
            await updateWorkOrderStatus(workOrder.id, 'completed', user.uid);
            toast({ title: 'Work Completed', description: 'Work order has been marked as completed.' });
            loadData();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleConvertToInvoice = async () => {
        if (!user || !workOrder) return;
        setIsConverting(true);
        try {
            const invoice = await convertWorkOrderToInvoice(workOrder.id, user.uid);
            toast({ title: 'Invoice Created', description: `Invoice ${invoice.invoiceNumber} has been created.` });
            router.push('/accounting/accounts-receivable');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Conversion Failed', description: error.message });
        } finally {
            setIsConverting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    if (!workOrder) {
        return (
            <div className="p-6 text-center">
                <p className="text-muted-foreground">Work order not found.</p>
                <Button variant="outline" className="mt-4" onClick={() => router.push('/accounting/work-orders')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Work Orders
                </Button>
            </div>
        );
    }

    const config = statusConfig[workOrder.status];
    const StatusIcon = config.icon;
    const subtotal = lineItems.reduce((acc, item) => acc + item.quantity * item.price, 0);
    const tax = lineItems.reduce((acc, item) => {
        const itemTotal = item.quantity * item.price;
        return acc + itemTotal * ((item.taxRate || 0) / 100);
    }, 0);

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <AccountingPageHeader pageTitle={`Work Order ${workOrder.workOrderNumber}`} />
            <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => router.push('/accounting/work-orders')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Work Orders
                </Button>
                <Badge variant="outline" className={cn(config.color, 'text-sm px-3 py-1')}>
                    <StatusIcon className="h-4 w-4 mr-2" />
                    {config.label}
                </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="shadow-lg">
                        <CardHeader className="bg-primary/5 border-b">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-2xl">{workOrder.workOrderNumber}</CardTitle>
                                    <CardDescription className="text-lg font-medium text-foreground mt-1">
                                        {workOrder.companyName}
                                    </CardDescription>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground">Total Amount</p>
                                    <p className="text-2xl font-bold font-mono text-primary">{formatCurrency(workOrder.totalAmount)}</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Created</p>
                                    <p className="text-sm">{workOrder.createdAt ? format(new Date(workOrder.createdAt), 'PPP') : '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Scheduled</p>
                                    <p className="text-sm">{workOrder.scheduledDate ? format(new Date(workOrder.scheduledDate), 'PPP') : 'Not scheduled'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Assigned Worker</p>
                                    <p className="text-sm">{workOrder.assignedWorkerName || 'Unassigned'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Completed</p>
                                    <p className="text-sm">{workOrder.completedDate ? format(new Date(workOrder.completedDate), 'PPP') : '—'}</p>
                                </div>
                            </div>

                            {workOrder.notes && (
                                <div className="mb-6">
                                    <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Notes</p>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{workOrder.notes}</p>
                                </div>
                            )}

                            <Separator className="my-4" />

                            <h3 className="font-bold text-lg mb-3">Line Items</h3>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-center">Qty</TableHead>
                                        <TableHead className="text-right">Price</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {lineItems.length > 0 ? lineItems.map((item, idx) => (
                                        <TableRow key={item.id || idx}>
                                            <TableCell className="font-medium">{item.description}</TableCell>
                                            <TableCell className="text-center">{item.quantity}</TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrency(item.price)}</TableCell>
                                            <TableCell className="text-right font-mono font-bold">{formatCurrency(item.quantity * item.price)}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-muted-foreground italic py-6">
                                                No line items.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>

                            <div className="flex justify-end mt-4">
                                <div className="w-full max-w-xs space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Subtotal:</span>
                                        <span className="font-mono">{formatCurrency(subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Tax:</span>
                                        <span className="font-mono">{formatCurrency(tax)}</span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between font-bold text-lg">
                                        <span>Total:</span>
                                        <span className="font-mono text-primary">{formatCurrency(subtotal + tax)}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-4">
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-lg">Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {workOrder.status === 'pending' && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-sm font-bold flex items-center gap-2 mb-2">
                                            <Calendar className="h-4 w-4" /> Schedule Date
                                        </label>
                                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className="w-full justify-start">
                                                    <Calendar className="mr-2 h-4 w-4" />
                                                    {scheduledDate ? format(scheduledDate, 'PPP') : 'Pick a date'}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <CustomCalendar
                                                    mode="single"
                                                    selected={scheduledDate}
                                                    onSelect={(date) => {
                                                        if (date) {
                                                            setScheduledDate(date);
                                                            setIsCalendarOpen(false);
                                                        }
                                                    }}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold flex items-center gap-2 mb-2">
                                            <User className="h-4 w-4" /> Assign Worker
                                        </label>
                                        <Select
                                            value={selectedWorkerId || 'none'}
                                            onValueChange={(val) => setSelectedWorkerId(val === 'none' ? null : val)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select worker..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">No assignment</SelectItem>
                                                {workers.map(w => (
                                                    <SelectItem key={w.id} value={w.id}>
                                                        {w.name} {w.employeeNumber ? `(${w.employeeNumber})` : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button
                                        className="w-full"
                                        onClick={handleSchedule}
                                        disabled={!scheduledDate || isUpdating}
                                    >
                                        {isUpdating ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Calendar className="mr-2 h-4 w-4" />}
                                        Schedule & Create Calendar Task
                                    </Button>
                                </div>
                            )}

                            {workOrder.status === 'scheduled' && (
                                <Button
                                    className="w-full"
                                    variant="default"
                                    onClick={handleStartWork}
                                    disabled={isUpdating}
                                >
                                    {isUpdating ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                                    Start Work
                                </Button>
                            )}

                            {workOrder.status === 'in_progress' && (
                                <Button
                                    className="w-full"
                                    variant="default"
                                    onClick={handleComplete}
                                    disabled={isUpdating}
                                >
                                    {isUpdating ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                    Mark as Completed
                                </Button>
                            )}

                            {workOrder.status === 'completed' && (
                                <Button
                                    className="w-full"
                                    variant="default"
                                    onClick={handleConvertToInvoice}
                                    disabled={isConverting}
                                >
                                    {isConverting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <FileDigit className="mr-2 h-4 w-4" />}
                                    Convert to Invoice
                                </Button>
                            )}

                            <div className="pt-4 border-t">
                                <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3">Status Timeline</h4>
                                <div className="space-y-2">
                                    {(['pending', 'scheduled', 'in_progress', 'completed'] as WorkOrderStatus[]).map((s, idx) => {
                                        const isActive = workOrder.status === s;
                                        const isPast = ['pending', 'scheduled', 'in_progress', 'completed'].indexOf(workOrder.status) > idx;
                                        const sConfig = statusConfig[s];
                                        const SIcon = sConfig.icon;
                                        return (
                                            <div key={s} className={cn('flex items-center gap-2 text-sm', isActive ? 'font-bold' : isPast ? 'text-muted-foreground' : 'text-muted-foreground/40')}>
                                                <SIcon className={cn('h-4 w-4', isActive ? 'text-primary' : '')} />
                                                {sConfig.label}
                                                {isActive && <Badge variant="outline" className="ml-auto text-xs">Current</Badge>}
                                                {isPast && <CheckCircle className="h-3 w-3 ml-auto text-green-500" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {workOrder.quoteId && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Source Quote</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => router.push('/accounting/quotes')}
                                >
                                    <Briefcase className="mr-2 h-4 w-4" /> View Quote
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}