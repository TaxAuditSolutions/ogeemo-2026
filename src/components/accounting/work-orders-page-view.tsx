'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoaderCircle, MoreVertical, Eye, Calendar, User, CheckCircle, FileDigit, ClipboardList, Clock, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getWorkOrders, convertWorkOrderToInvoice, type WorkOrder, type WorkOrderStatus } from '@/core/accounting-service';
import { AccountingPageHeader } from './page-header';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

const statusConfig: Record<WorkOrderStatus, { label: string; color: string; icon: React.ElementType }> = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
    scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Calendar },
    in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: LoaderCircle },
    completed: { label: 'Completed', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-200', icon: ClipboardList },
};

export function WorkOrdersPageView() {
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isConverting, setIsConverting] = useState<string | null>(null);

    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const loadData = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const fetchedWorkOrders = await getWorkOrders(user.uid);
            setWorkOrders(fetchedWorkOrders);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Load Failed', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleConvertToInvoice = async (workOrderId: string) => {
        if (!user) return;
        setIsConverting(workOrderId);
        try {
            const invoice = await convertWorkOrderToInvoice(workOrderId, user.uid);
            toast({ title: 'Invoice Created', description: `Invoice ${invoice.invoiceNumber} has been created from this work order.` });
            loadData();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Conversion Failed', description: error.message });
        } finally {
            setIsConverting(null);
        }
    };

    const stats = {
        pending: workOrders.filter(wo => wo.status === 'pending').length,
        scheduled: workOrders.filter(wo => wo.status === 'scheduled').length,
        inProgress: workOrders.filter(wo => wo.status === 'in_progress').length,
        completed: workOrders.filter(wo => wo.status === 'completed').length,
    };

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <AccountingPageHeader pageTitle="Work Orders" />
            <header className="text-center">
                <h1 className="text-3xl font-bold font-headline text-primary">Work Orders</h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                    Track work from quote approval through completion to invoicing. The bridge between quotes and invoices.
                </p>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                <Card className="border-yellow-200">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-yellow-700">Pending</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold text-yellow-600">{stats.pending}</p></CardContent>
                </Card>
                <Card className="border-blue-200">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-blue-700">Scheduled</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold text-blue-600">{stats.scheduled}</p></CardContent>
                </Card>
                <Card className="border-purple-200">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-purple-700">In Progress</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold text-purple-600">{stats.inProgress}</p></CardContent>
                </Card>
                <Card className="border-green-200">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-green-700">Completed</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold text-green-600">{stats.completed}</p></CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>All Work Orders</CardTitle>
                        <CardDescription>Manage work orders from quote to invoice.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-48">
                            <LoaderCircle className="h-8 w-8 animate-spin" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>WO #</TableHead>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Scheduled</TableHead>
                                    <TableHead>Worker</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {workOrders.length > 0 ? workOrders.map((wo) => {
                                    const config = statusConfig[wo.status];
                                    const StatusIcon = config.icon;
                                    return (
                                        <TableRow key={wo.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/accounting/work-orders/${wo.id}`)}>
                                            <TableCell className="font-medium">{wo.workOrderNumber}</TableCell>
                                            <TableCell>{wo.companyName}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`${config.color} text-xs`}>
                                                    <StatusIcon className="h-3 w-3 mr-1" />
                                                    {config.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {wo.scheduledDate ? format(new Date(wo.scheduledDate), 'MMM d, yyyy') : '—'}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {wo.assignedWorkerName || '—'}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold">{formatCurrency(wo.totalAmount)}</TableCell>
                                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => router.push(`/accounting/work-orders/${wo.id}`)}>
                                                            <Eye className="mr-2 h-4 w-4" /> View Details
                                                        </DropdownMenuItem>
                                                        {wo.status === 'completed' && (
                                                            <DropdownMenuItem
                                                                onClick={() => handleConvertToInvoice(wo.id)}
                                                                disabled={isConverting === wo.id}
                                                            >
                                                                {isConverting === wo.id ? (
                                                                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <FileDigit className="mr-2 h-4 w-4" />
                                                                )}
                                                                Convert to Invoice
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                }) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center h-24 text-muted-foreground italic">
                                            No work orders found. Convert an approved quote to create one.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}