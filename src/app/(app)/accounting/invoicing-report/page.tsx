'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
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
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoaderCircle, MoreVertical, Edit, Trash2, Calendar as CalendarIcon, FilterX } from 'lucide-react';
import { format, isWithinInterval } from 'date-fns';
import { type DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { AccountingPageHeader } from '@/components/accounting/page-header';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getInvoices, deleteInvoice, type Invoice } from '@/services/accounting-service';
import { getContacts, type Contact } from '@/services/contact-service';
import { ContactSelector } from '@/components/contacts/contact-selector';
import { cn } from '@/lib/utils';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';

const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const EDIT_INVOICE_ID_KEY = 'editInvoiceId';

function InvoicingReportContent() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

    const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const highlightedId = searchParams.get('highlight');

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        Promise.all([
            getInvoices(user.uid),
            getContacts(user.uid),
        ]).then(([invoiceData, contactData]) => {
            setInvoices(invoiceData);
            setContacts(contactData);
        }).catch(error => {
            toast({ variant: 'destructive', title: 'Failed to load data', description: error.message });
        }).finally(() => {
            setIsLoading(false);
        });
    }, [user, toast]);

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

    const filteredInvoices = useMemo(() => {
        return invoices
            .filter(invoice => {
                if (selectedContactId && invoice.contactId !== selectedContactId) {
                    return false;
                }
                if (dateRange?.from) {
                    const toDate = dateRange.to || dateRange.from;
                    if (!isWithinInterval(new Date(invoice.invoiceDate), { start: dateRange.from, end: toDate })) {
                        return false;
                    }
                }
                return true;
            })
            .sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
    }, [invoices, selectedContactId, dateRange]);

    const handleEdit = (invoiceId: string) => {
        localStorage.setItem(EDIT_INVOICE_ID_KEY, invoiceId);
        router.push('/accounting/invoices/create');
    };

    const handleConfirmDelete = async () => {
        if (!invoiceToDelete) return;
        try {
            await deleteInvoice(invoiceToDelete.id);
            setInvoices(prev => prev.filter(inv => inv.id !== invoiceToDelete.id));
            toast({ title: 'Invoice Deleted' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to delete invoice', description: error.message });
        } finally {
            setInvoiceToDelete(null);
        }
    };

    const clearFilters = () => {
        setSelectedContactId(null);
        setDateRange(undefined);
    };

    return (
        <>
            <div className="p-4 sm:p-6 space-y-6">
                <AccountingPageHeader pageTitle="Invoicing Report" />
                <header className="text-center">
                    <h1 className="text-3xl font-bold font-headline text-primary">Invoicing Report</h1>
                    <p className="text-muted-foreground">View and filter all of your invoices.</p>
                </header>

                <Card>
                    <CardHeader>
                        <CardTitle>Filters</CardTitle>
                        <div className="flex flex-wrap items-end gap-4 pt-2">
                           <div className="space-y-2">
                                <Label>Filter by Client</Label>
                                <ContactSelector contacts={contacts} selectedContactId={selectedContactId} onSelectContact={setSelectedContactId} />
                           </div>
                           <div className="space-y-2">
                                <Label>Filter by Date Range</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-[280px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y")) : <span>Pick a date range</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2}/></PopoverContent>
                                </Popover>
                           </div>
                            <Button variant="ghost" onClick={clearFilters} disabled={!selectedContactId && !dateRange}>
                                <FilterX className="mr-2 h-4 w-4"/> Clear Filters
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                             <div className="flex h-48 items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin" /></div>
                        ) : (
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Invoice #</TableHead>
                                        <TableHead>Client</TableHead>
                                        <TableHead>Invoice Date</TableHead>
                                        <TableHead>Due Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredInvoices.length > 0 ? filteredInvoices.map(invoice => (
                                        <TableRow 
                                            key={invoice.id} 
                                            id={`row-${invoice.id}`}
                                            className={cn(highlightedId === invoice.id && "bg-primary/10 animate-pulse ring-2 ring-primary ring-inset")}
                                        >
                                            <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                                            <TableCell>{invoice.companyName}</TableCell>
                                            <TableCell>{format(invoice.invoiceDate, 'PP')}</TableCell>
                                            <TableCell>{format(invoice.dueDate, 'PP')}</TableCell>
                                            <TableCell><Badge variant="outline">{invoice.status}</Badge></TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrency(invoice.originalAmount)}</TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4"/></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuItem onSelect={() => handleEdit(invoice.id)}><Edit className="mr-2 h-4 w-4"/>Edit Invoice</DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => setInvoiceToDelete(invoice)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete Invoice</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center">No invoices found for the selected filters.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
             <AlertDialog open={!!invoiceToDelete} onOpenChange={() => setInvoiceToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete invoice {invoiceToDelete?.invoiceNumber}. This action cannot be undone.</AlertDialogDescription>
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

export default function InvoicingReportPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><LoaderCircle className="h-10 w-10 animate-spin text-primary" /></div>}>
      <InvoicingReportContent />
    </Suspense>
  );
}