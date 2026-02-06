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
import { LoaderCircle, FileDigit, Landmark, CheckCircle, MoreVertical } from 'lucide-react';
import { format } from "date-fns";
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getInvoices, type Invoice, postInvoicePayment } from '@/services/accounting-service';
import { AccountingPageHeader } from './page-header';
import { Badge } from '@/components/ui/badge';

const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

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
            setInvoices(allInvoices);
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
                description: `${formatCurrency(amount)} recorded for Invoice #${selectedInvoice.invoiceNumber}. Income ledger updated.` 
            });
            setIsPaymentDialogOpen(false);
            loadData();
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
                    Manage your outstanding invoices and record client payments.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
                <Card className="md:col-span-1">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-destructive">{formatCurrency(totalOutstanding)}</p>
                    </CardContent>
                </Card>
                <Card className="md:col-span-2 flex flex-col justify-center px-6">
                    <p className="text-sm text-muted-foreground">
                        Post a payment to mark an invoice as paid. This will automatically create an income entry in your BKS Ledger.
                    </p>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Invoice Registry</CardTitle>
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
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Balance Due</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invoices.length > 0 ? invoices.map((inv) => {
                                    const balance = inv.originalAmount - inv.amountPaid;
                                    const isPaid = balance <= 0.01;
                                    return (
                                        <TableRow key={inv.id}>
                                            <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                                            <TableCell>{inv.companyName}</TableCell>
                                            <TableCell>{format(inv.invoiceDate, 'PP')}</TableCell>
                                            <TableCell>
                                                <Badge variant={isPaid ? 'secondary' : 'default'}>
                                                    {isPaid ? 'Paid' : 'Outstanding'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {formatCurrency(balance)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    {!isPaid && (
                                                        <Button size="sm" variant="outline" onClick={() => handleOpenPaymentDialog(inv)}>
                                                            <Landmark className="mr-2 h-4 w-4"/> Post Payment
                                                        </Button>
                                                    )}
                                                    <Button size="sm" variant="ghost" asChild>
                                                        <Link href={`/accounting/invoices/preview?action=print&invoiceId=${inv.id}`} target="_blank">
                                                            <FileDigit className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                }) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                            No invoices found.
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
                        <DialogTitle>Post Payment</DialogTitle>
                        <DialogDescription>
                            Record a payment for Invoice #{selectedInvoice?.invoiceNumber}.
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
                            Confirm Payment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
