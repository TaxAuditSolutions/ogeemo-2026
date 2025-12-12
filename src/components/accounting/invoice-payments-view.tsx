

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
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
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Trash2, HandCoins, FileText, LoaderCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format as formatDate } from "date-fns";
import { useAuth } from '@/context/auth-context';
import { getInvoices, updateInvoiceWithLineItems, deleteInvoice, type Invoice, addIncomeTransaction } from '@/services/accounting-service';

const EDIT_INVOICE_ID_KEY = 'editInvoiceId';
const RECEIPT_DATA_KEY = 'ogeemo-receipt-data';

export function InvoicePaymentsView() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [invoiceToPay, setInvoiceToPay] = useState<Invoice | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
    const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
    const { toast } = useToast();
    const router = useRouter();
    const { user } = useAuth();

    useEffect(() => {
        async function loadInvoices() {
            if (!user) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                const fetchedInvoices = await getInvoices(user.uid);
                setInvoices(fetchedInvoices.sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()));
            } catch (error) {
                console.error("Failed to load invoice data:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load invoice data.' });
            } finally {
                setIsLoading(false);
            }
        }
        loadInvoices();
    }, [toast, user]);
    
    const totalBalanceDue = useMemo(() => {
        return invoices.reduce((acc, invoice) => {
            const balance = invoice.originalAmount - invoice.amountPaid;
            return acc + (balance > 0 ? balance : 0);
        }, 0);
    }, [invoices]);

    const handleOpenPaymentDialog = (invoice: Invoice) => {
        setInvoiceToPay(invoice);
        const balanceDue = invoice.originalAmount - invoice.amountPaid;
        setPaymentAmount(balanceDue > 0 ? parseFloat(balanceDue.toFixed(2)) : '');
        setIsPaymentDialogOpen(true);
    };

    const handleConfirmPayment = async () => {
        if (!invoiceToPay || !user || paymentAmount === '' || Number(paymentAmount) <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a valid payment amount.' });
            return;
        }

        try {
            const newAmountPaid = invoiceToPay.amountPaid + Number(paymentAmount);
            await updateInvoiceWithLineItems(invoiceToPay.id, { amountPaid: newAmountPaid }, []);

            // Create a corresponding income transaction
            await addIncomeTransaction({
                userId: user.uid,
                date: formatDate(new Date(), 'yyyy-MM-dd'),
                company: invoiceToPay.companyName,
                description: `Payment for Invoice #${invoiceToPay.invoiceNumber}`,
                totalAmount: Number(paymentAmount),
                incomeCategory: 'Service Revenue', // Default category, could be made dynamic
                depositedTo: 'Bank Account #1', // Default account, could be made dynamic
                type: 'business',
            });

            setInvoices(prev => 
                prev.map(inv => 
                    inv.id === invoiceToPay.id ? { ...inv, amountPaid: newAmountPaid } : inv
                )
            );
            
            toast({ title: 'Payment Recorded', description: `Payment of ${Number(paymentAmount).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} recorded and added to income ledger.` });
            
            setIsPaymentDialogOpen(false);
            setInvoiceToPay(null);
            setPaymentAmount('');
        } catch (error) {
            console.error("Failed to record payment:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not record payment.' });
        }
    };
    
    const handleEditInvoice = (invoice: Invoice) => {
        try {
            localStorage.setItem(EDIT_INVOICE_ID_KEY, invoice.id);
            router.push('/accounting/invoices/create');
        } catch (error) {
            console.error('Failed to set invoice for editing:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not prepare the invoice for editing.' });
        }
    };
    
    const handleDeleteInvoice = async () => {
        if (!invoiceToDelete) return;
        try {
            await deleteInvoice(invoiceToDelete.id);
            setInvoices(prev => prev.filter(inv => inv.id !== invoiceToDelete.id));
            toast({ title: "Invoice Deleted", description: `Invoice ${invoiceToDelete.invoiceNumber} has been removed.` });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Delete Failed", description: error.message });
        } finally {
            setInvoiceToDelete(null);
        }
    };

    const handleCreateReceipt = (invoice: Invoice) => {
        const otherInvoices = invoices.filter(i => i.companyName === invoice.companyName && i.id !== invoice.id);
        const carryForwardAmount = otherInvoices.reduce((acc, curr) => {
            return acc + (curr.originalAmount - curr.amountPaid);
        }, 0);
        
        try {
            const serializableInvoice = {
                ...invoice,
                dueDate: invoice.dueDate.toISOString(),
                invoiceDate: invoice.invoiceDate.toISOString(),
                createdAt: invoice.createdAt.toISOString(),
            };
            
            const receiptPayload = {
                invoice: serializableInvoice,
                carryForwardAmount
            };

            sessionStorage.setItem(RECEIPT_DATA_KEY, JSON.stringify(receiptPayload));
            router.push('/accounting/invoices/receipt');
        } catch (error) {
            console.error('Failed to set receipt data:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not generate the receipt.' });
        }
    };

    const getStatusInfo = (invoice: Invoice): { status: string; badgeVariant: "secondary" | "destructive" | "outline" } => {
        const balanceDue = invoice.originalAmount - invoice.amountPaid;
        if (balanceDue <= 0.001) {
            return { status: "Paid", badgeVariant: "secondary" };
        }
        if (invoice.amountPaid > 0) {
            return { status: "Partially Paid", badgeVariant: "outline" };
        }
        if (new Date(invoice.dueDate) < new Date()) {
            return { status: "Overdue", badgeVariant: "destructive" };
        }
        return { status: "Outstanding", badgeVariant: "outline" };
    };

    return (
        <>
            <div className="space-y-6">
                <Card>
                    <CardHeader className="text-center">
                        <CardTitle>Accounts Receivable</CardTitle>
                        <CardDescription>A list of outstanding invoices</CardDescription>
                         <div className="pt-2">
                            <p className="text-sm text-muted-foreground">Total Balance Due</p>
                            <p className="text-2xl font-bold text-primary">{totalBalanceDue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Invoice #</TableHead>
                                        <TableHead>Company</TableHead>
                                        <TableHead>Due Date</TableHead>
                                        <TableHead className="text-right">Original Amount</TableHead>
                                        <TableHead className="text-right">Amount Paid</TableHead>
                                        <TableHead className="text-right">Balance Due</TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow><TableCell colSpan={8} className="text-center h-24"><LoaderCircle className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                                    ) : invoices.length > 0 ? invoices.map((invoice) => {
                                        const { status, badgeVariant } = getStatusInfo(invoice);
                                        const balanceDue = invoice.originalAmount - invoice.amountPaid;
                                        return (
                                            <TableRow key={invoice.id}>
                                                <TableCell>{invoice.invoiceNumber}</TableCell>
                                                <TableCell>{invoice.companyName}</TableCell>
                                                <TableCell>{formatDate(new Date(invoice.dueDate), 'PP')}</TableCell>
                                                <TableCell className="text-right font-mono">{invoice.originalAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</TableCell>
                                                <TableCell className="text-right font-mono text-green-600">{invoice.amountPaid.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</TableCell>
                                                <TableCell className="text-right font-mono">{balanceDue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</TableCell>
                                                <TableCell className="text-center"><Badge variant={badgeVariant} className={badgeVariant === 'secondary' ? 'bg-green-100 text-green-800' : ''}>{status}</Badge></TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onSelect={() => handleCreateReceipt(invoice)}><FileText className="mr-2 h-4 w-4"/>View / Print Receipt</DropdownMenuItem>
                                                            <DropdownMenuItem onSelect={() => handleEditInvoice(invoice)}><Edit className="mr-2 h-4 w-4"/>Edit Invoice</DropdownMenuItem>
                                                            <DropdownMenuItem onSelect={() => handleOpenPaymentDialog(invoice)} disabled={status === 'Paid'}><HandCoins className="mr-2 h-4 w-4"/>Post Payment</DropdownMenuItem>
                                                            <DropdownMenuItem onSelect={() => setInvoiceToDelete(invoice)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete Invoice</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    }) : (
                                        <TableRow><TableCell colSpan={8} className="text-center h-24 text-muted-foreground">No invoices found.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Post Payment for {invoiceToPay?.invoiceNumber}</DialogTitle>
                        <DialogDescription>Enter the amount received. This will be added to your income ledger.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-2">
                        <Label htmlFor="payment-amount">Payment Amount</Label>
                        <div className="relative">
                            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                            <Input id="payment-amount" type="number" placeholder="0.00" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))} className="pl-7"/>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleConfirmPayment}>Post Payment</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            <AlertDialog open={!!invoiceToDelete} onOpenChange={() => setInvoiceToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete invoice {invoiceToDelete?.invoiceNumber} and all of its data.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteInvoice} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
