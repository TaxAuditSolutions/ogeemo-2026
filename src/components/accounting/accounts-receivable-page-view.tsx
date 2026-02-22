
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoaderCircle, FileDigit, Landmark, CheckCircle, MoreVertical, BookOpen } from 'lucide-react';
import { format } from "date-fns";
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getInvoices, type Invoice, postInvoicePayment } from '@/services/accounting-service';
import { AccountingPageHeader } from './page-header';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const paymentMethodOptions = ["Cash", "Cheque", "Credit Card", "Email Transfer", "Bank Transfer", "In Kind", "Miscellaneous", "GL Adjustment"];
const defaultDepositAccounts = ["Bank Account #1", "Credit Card #1", "Cash Account"];

export function AccountsReceivablePageView() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    
    // Payment form state
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [depositAccount, setDepositAccount] = useState('Bank Account #1');
    const [isSaving, setIsSaving] = useState(false);

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
            const allInvoices = await getInvoices(user.uid);
            // Strictly show outstanding invoices
            setInvoices(allInvoices.filter(inv => inv.originalAmount - inv.amountPaid > 0.01));
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load invoice data.' });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleOpenPaymentDialog = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setPaymentAmount(String(invoice.originalAmount - invoice.amountPaid));
        setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
        setIsPaymentDialogOpen(true);
    };

    const handlePostPayment = async () => {
        if (!user || !selectedInvoice) return;
        
        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a valid positive amount.' });
            return;
        }

        setIsSaving(true);
        try {
            await postInvoicePayment(user.uid, selectedInvoice.id, amount, paymentDate, depositAccount);
            toast({ 
                title: 'Payment Posted', 
                description: `${formatCurrency(amount)} recorded. Invoice updated and transaction added to GL.` 
            });
            setIsPaymentDialogOpen(false);
            loadData(); // Refresh list - fully paid invoices will disappear
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Payment Failed', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const totalOutstanding = useMemo(() => {
        return invoices.reduce((sum, inv) => sum + (inv.originalAmount - inv.amountPaid), 0);
    }, [invoices]);

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <AccountingPageHeader pageTitle="Accounts Receivable" />
            <header className="text-center">
                <h1 className="text-3xl font-bold font-headline text-primary">
                    Accounts Receivable
                </h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                    Registry of all outstanding client invoices. Post a payment to move the record to the General Ledger.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
                <Card className="md:col-span-1 border-primary/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-destructive">{formatCurrency(totalOutstanding)}</p>
                    </CardContent>
                </Card>
                <Card className="md:col-span-2 flex flex-col justify-center px-6 bg-muted/30">
                    <p className="text-sm text-muted-foreground italic">
                        "If it's not paid, it's a promise. If it's paid, it's a transaction."
                        <br />
                        Fully paid invoices are automatically moved to the BKS Ledger.
                    </p>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Outstanding Invoices</CardTitle>
                        <CardDescription>Click "Post Payment" once the money arrives in your bank.</CardDescription>
                    </div>
                    <Button asChild>
                        <Link href="/accounting/invoices/create">
                            <Plus className="mr-2 h-4 w-4" /> Create New Invoice
                        </Link>
                    </Button>
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
                                    <TableHead>Invoice #</TableHead>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Balance Due</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invoices.length > 0 ? invoices.map((inv) => {
                                    const balance = inv.originalAmount - inv.amountPaid;
                                    return (
                                        <TableRow key={inv.id}>
                                            <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                                            <TableCell>{inv.companyName}</TableCell>
                                            <TableCell>{format(inv.invoiceDate, 'PP')}</TableCell>
                                            <TableCell className="text-right font-mono text-destructive">
                                                {formatCurrency(balance)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary/5" onClick={() => handleOpenPaymentDialog(inv)}>
                                                        <Landmark className="mr-2 h-4 w-4"/> Post Payment
                                                    </Button>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem asChild>
                                                                <Link href={`/accounting/invoices/preview?action=print&invoiceId=${inv.id}`} target="_blank">
                                                                    <BookOpen className="mr-2 h-4 w-4" /> View PDF
                                                                </Link>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => {
                                                                localStorage.setItem('editInvoiceId', inv.id);
                                                                router.push('/accounting/invoices/create');
                                                            }}>
                                                                <Pencil className="mr-2 h-4 w-4" /> Edit Invoice
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                }) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                            No outstanding receivables. All invoices are either paid (in GL) or haven't been created yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Post Client Payment</DialogTitle>
                        <DialogDescription>
                            Confirm funds received for Invoice #{selectedInvoice?.invoiceNumber}. This will move the record to your BKS General Ledger.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="pay-amount">Payment Amount</Label>
                            <div className="relative">
                                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                                <Input id="pay-amount" type="number" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="pl-7" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pay-date">Date Received</Label>
                            <Input id="pay-date" type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pay-account">Deposit To</Label>
                            <Select value={depositAccount} onValueChange={setDepositAccount}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {defaultDepositAccounts.map(acc => <SelectItem key={acc} value={acc}>{acc}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handlePostPayment} disabled={isSaving}>
                            {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4" />}
                            Post to GL
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
