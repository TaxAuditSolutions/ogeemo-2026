
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Logo } from '@/components/logo';
import { Separator } from '@/components/ui/separator';
import { Printer, Mail, ArrowLeft, LoaderCircle, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useReactToPrint } from '@/hooks/use-react-to-print';
import { Textarea } from '@/components/ui/textarea';

const RECEIPT_DATA_KEY = 'ogeemo-receipt-data';

interface DeserializedInvoice {
  id: string;
  invoiceNumber: string;
  companyName: string;
  originalAmount: number;
  amountPaid: number;
  dueDate: string; // ISO string
  invoiceDate: string; // ISO string
  createdAt: string; // ISO string
}

interface ReceiptData {
  invoice: DeserializedInvoice;
  carryForwardAmount: number;
}

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

export default function ReceiptPage() {
    const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notes, setNotes] = useState("");
    const { toast } = useToast();
    const router = useRouter();
    const { handlePrint, contentRef } = useReactToPrint();

    useEffect(() => {
        try {
            const dataRaw = sessionStorage.getItem(RECEIPT_DATA_KEY);
            if (dataRaw) {
                const parsedData = JSON.parse(dataRaw);
                setReceiptData(parsedData);
            } else {
                setError('No receipt data found. Please return to the previous page and try again.');
            }
        } catch (e) {
            console.error("Failed to load receipt data:", e);
            setError(e instanceof Error ? e.message : 'Could not load receipt data due to an internal error.');
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    const handleSendEmail = () => {
        if (!receiptData) return;
        toast({
            title: "Email Sent (Simulation)",
            description: `The receipt for invoice ${receiptData.invoice.invoiceNumber} has been sent to ${receiptData.invoice.companyName}.`,
        });
    };
    
    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center p-4">
                <LoaderCircle className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (error || !receiptData) {
         return (
            <div className="flex h-full w-full items-center justify-center p-4">
                <Card className="w-full max-w-md text-center">
                    <CardContent className="p-6">
                        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
                        <h2 className="mt-4 text-xl font-semibold">Could not load receipt</h2>
                        <p className="mt-2 text-muted-foreground">{error || "An unknown error occurred."}</p>
                        <Button className="mt-6" onClick={() => router.push('/accounting/accounts-receivable')}>
                             <ArrowLeft className="mr-2 h-4 w-4" />
                            Return to Accounts Receivable
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    const { invoice, carryForwardAmount } = receiptData;
    const totalBalanceDue = (invoice.originalAmount - invoice.amountPaid) + carryForwardAmount;
    const isPaidInFull = totalBalanceDue <= 0.001;
    const dueDate = parseISO(invoice.dueDate);

    return (
        <div className="p-4 sm:p-6 space-y-4">
            <div className="flex justify-between items-center max-w-4xl mx-auto">
                 <Button variant="outline" onClick={() => router.push('/accounting/accounts-receivable')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Accounts Receivable
                </Button>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4"/> Print Receipt</Button>
                    <Button onClick={handleSendEmail}><Mail className="mr-2 h-4 w-4"/> Email Receipt</Button>
                </div>
            </div>
             <Card id="invoice-preview" ref={contentRef} className="max-w-4xl mx-auto">
                <CardContent className="p-8 relative">
                    {isPaidInFull && (
                        <div style={{
                            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-15deg)',
                            fontSize: '8rem', fontWeight: 'bold', color: 'rgba(0, 128, 0, 0.10)',
                            border: '15px solid rgba(0, 128, 0, 0.10)', padding: '1rem 2rem', borderRadius: '10px',
                            zIndex: 1, pointerEvents: 'none', lineHeight: '1'
                        }}>
                            PAID
                        </div>
                    )}
                    <header className="flex justify-between items-start pb-6 border-b">
                        <Logo className="text-primary"/>
                        <div className="text-right">
                            <h1 className="text-4xl font-bold uppercase text-gray-700">Receipt</h1>
                            <p className="text-gray-500">#{invoice.invoiceNumber}</p>
                        </div>
                    </header>
                    <section className="flex justify-between mt-6">
                        <div>
                            <h2 className="font-bold text-gray-500 uppercase mb-2">Bill To</h2>
                            <p className="font-bold text-lg">{invoice.companyName}</p>
                        </div>
                        <div className="text-right">
                            <p><span className="font-bold text-gray-500">Date Issued:</span> {format(new Date(), 'PP')}</p>
                            <p><span className="font-bold text-gray-500">Original Due Date:</span> {format(dueDate, 'PP')}</p>
                        </div>
                    </section>
                    <section className="mt-8">
                        <Table className="text-sm">
                            <TableHeader className="bg-gray-100">
                                <TableRow>
                                    <TableHead className="w-1/2 text-gray-600">Description</TableHead>
                                    <TableHead className="text-right text-gray-600">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell>Amount carried forward from previous invoices</TableCell>
                                    <TableCell className="text-right">{formatCurrency(carryForwardAmount)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Original Invoice Amount (#{invoice.invoiceNumber})</TableCell>
                                    <TableCell className="text-right">{formatCurrency(invoice.originalAmount)}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </section>
                    <section className="flex justify-end mt-6">
                        <div className="w-full max-w-sm space-y-2">
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">Total Due Before Payment:</span>
                                <span>{formatCurrency(carryForwardAmount + invoice.originalAmount)}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Payment received on {format(new Date(), 'PP')}:</span>
                                <span className="text-green-600">({formatCurrency(invoice.amountPaid)})</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between font-bold text-lg">
                                <span className="text-gray-600">Total Balance Due:</span>
                                <span>{formatCurrency(totalBalanceDue)}</span>
                            </div>
                        </div>
                    </section>
                    <section className="mt-8">
                        <h4 className="font-bold text-gray-500 uppercase mb-2">Notes</h4>
                        <Textarea
                            placeholder="Add a personal note to your client..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="print:border-none print:p-0 print:shadow-none print:bg-transparent"
                        />
                    </section>
                    <footer className="mt-12 pt-6 border-t text-center text-xs text-gray-400">
                        <p>Thank you for your business!</p>
                    </footer>
                </CardContent>
             </Card>
        </div>
    );
}
