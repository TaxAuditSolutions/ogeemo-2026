'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Logo } from '@/components/logo';
import { Separator } from '@/components/ui/separator';
import { Printer, ArrowLeft, LoaderCircle, AlertTriangle, FileDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { UserProfile } from '@/services/user-profile-service';

const INVOICE_PREVIEW_KEY = 'invoicePreviewData';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
  taxType?: string;
  taxRate?: number;
}

interface Address {
  street?: string;
  city?: string;
  provinceState?: string;
  postalCode?: string;
  country?: string;
}

interface InvoiceData {
  invoiceNumber: string;
  businessNumber?: string;
  companyName: string;
  contactAddress: Address;
  invoiceDate: string;
  dueDate: string;
  lineItems: LineItem[];
  notes: string;
  userProfile?: UserProfile;
}

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const formatAddress = (address: Address | string | undefined) => {
    if (!address) return '';
    if (typeof address === 'string') return address;
    const parts = [
        address.street,
        [address.city, address.provinceState, address.postalCode].filter(Boolean).join(', '),
        address.country,
    ];
    return parts.filter(Boolean).join('\n');
}

function PreviewContent() {
    const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();

    const handlePrint = useCallback(() => {
        window.print();
    }, []);

    useEffect(() => {
        try {
            const dataRaw = sessionStorage.getItem(INVOICE_PREVIEW_KEY);
            if (dataRaw) {
                const parsedData = JSON.parse(dataRaw);
                setInvoiceData(parsedData);
            } else {
                setError('No invoice data found.');
            }
        } catch (e) {
            setError('Could not load invoice data.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const action = searchParams.get('action');
        if (action === 'print' && !isLoading && invoiceData) {
            // Small delay to ensure data is fully settled in DOM before print dialog
            const timer = setTimeout(() => {
                handlePrint();
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [searchParams, isLoading, invoiceData, handlePrint]);

    if (isLoading) return <div className="flex h-screen items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin" /></div>;
    if (error || !invoiceData) {
         return (
            <div className="flex h-screen items-center justify-center p-4">
                <Card className="w-full max-w-md text-center">
                    <CardContent className="p-6">
                        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
                        <h2 className="mt-4 text-xl font-semibold">Could not load preview</h2>
                        <Button className="mt-6" onClick={() => router.push('/accounting/invoices/create')}>
                             <ArrowLeft className="mr-2 h-4 w-4" /> Return to Generator
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const subtotal = invoiceData.lineItems.reduce((acc, item) => acc + item.quantity * item.price, 0);
    const taxAmount = invoiceData.lineItems.reduce((acc, item) => acc + (item.quantity * item.price * ((item.taxRate || 0) / 100)), 0);
    const total = subtotal + taxAmount;
    const userProfile = invoiceData.userProfile;

    return (
        <div className="p-4 sm:p-6 space-y-4 bg-muted/30 min-h-screen">
            <div className="flex justify-between items-center max-w-4xl mx-auto print:hidden">
                 <Button variant="outline" onClick={() => router.push('/accounting/invoices/create')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Generator
                </Button>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4"/> Print
                    </Button>
                    <Button onClick={handlePrint}>
                        <FileDown className="mr-2 h-4 w-4"/> Download PDF
                    </Button>
                </div>
            </div>
             <Card id="invoice-preview" className="max-w-4xl mx-auto print:shadow-none print:border-none print:rounded-none">
                <CardContent className="p-8 md:p-12">
                    <header className="flex justify-between items-start pb-6 border-b">
                        <Logo className="text-primary"/>
                        <div className="text-right">
                            <h1 className="text-4xl font-bold uppercase text-gray-700">Invoice</h1>
                            <p className="text-gray-500">#{invoiceData.invoiceNumber}</p>
                            {invoiceData.businessNumber && <p className="text-sm text-gray-500 mt-1">BN: {invoiceData.businessNumber}</p>}
                        </div>
                    </header>
                    <section className="flex justify-between mt-6">
                        <div>
                            <h2 className="font-bold text-gray-500 uppercase mb-2">Bill To</h2>
                            <p className="font-bold text-lg">{invoiceData.companyName}</p>
                            {invoiceData.contactAddress && (
                                <p className="text-sm text-gray-600 whitespace-pre-wrap">{formatAddress(invoiceData.contactAddress)}</p>
                            )}
                        </div>
                        <div className="text-right">
                            <p><span className="font-bold text-gray-500">Invoice Date:</span> {format(parseISO(invoiceData.invoiceDate), 'PP')}</p>
                            <p><span className="font-bold text-gray-500">Due Date:</span> {format(parseISO(invoiceData.dueDate), 'PP')}</p>
                        </div>
                    </section>
                    <section className="mt-8">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-1/2">Description</TableHead>
                                    <TableHead className="text-center">Quantity</TableHead>
                                    <TableHead className="text-right">Unit Price</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invoiceData.lineItems.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell>{item.description}</TableCell>
                                        <TableCell className="text-center">{item.quantity}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(item.price)}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(item.price * item.quantity)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </section>
                    <section className="flex justify-end mt-6">
                        <div className="w-full max-w-sm space-y-2">
                            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal:</span><span className="font-mono">{formatCurrency(subtotal)}</span></div>
                             <div className="flex justify-between"><span className="text-muted-foreground">Tax:</span><span className="font-mono">{formatCurrency(taxAmount)}</span></div>
                            <Separator />
                            <div className="flex justify-between font-bold text-lg"><span>Total Due:</span><span>{formatCurrency(total)}</span></div>
                        </div>
                    </section>
                    <section className="mt-8">
                        <h4 className="font-bold text-gray-500 uppercase mb-2">Notes</h4>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoiceData.notes}</p>
                    </section>
                    <footer className="mt-12 pt-6 border-t text-center text-xs text-gray-400">
                        <p className="font-bold text-base text-gray-600">{userProfile?.companyName || userProfile?.displayName}</p>
                    </footer>
                </CardContent>
             </Card>
        </div>
    );
}

export default function InvoicePreviewPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin" /></div>}>
      <PreviewContent />
    </Suspense>
  );
}
