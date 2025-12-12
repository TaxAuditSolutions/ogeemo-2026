
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Logo } from '@/components/logo';
import { Separator } from '@/components/ui/separator';
import { Printer, Mail, ArrowLeft, LoaderCircle, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useReactToPrint } from '@/hooks/use-react-to-print';

const PAY_STUB_DATA_KEY = 'ogeemo-pay-stub-data';

interface PayStubData {
  payPeriod: { from: string; to: string };
  payDate: string;
  employeeName: string;
  grossPay: number;
  deductions: number;
  netPay: number;
  employeeAddress: string;
  companyAddress: string;
  companyName: string;
}

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

export default function PayStubPage() {
    const [stubData, setStubData] = useState<PayStubData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();
    const router = useRouter();
    const { handlePrint, contentRef } = useReactToPrint();

    useEffect(() => {
        try {
            const dataRaw = sessionStorage.getItem(PAY_STUB_DATA_KEY);
            if (dataRaw) {
                const parsedData: PayStubData = JSON.parse(dataRaw);
                setStubData(parsedData);
            } else {
                setError('No pay stub data found. Please return to the previous page and try again.');
            }
        } catch (e) {
            console.error("Failed to load pay stub data:", e);
            setError(e instanceof Error ? e.message : 'Could not load pay stub data due to an internal error.');
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    const handleSendEmail = () => {
        if (!stubData) return;
        toast({
            title: "Email Sent (Simulation)",
            description: `The pay stub has been sent to ${stubData.employeeName}.`,
        });
    };
    
    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center p-4">
                <LoaderCircle className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (error || !stubData) {
         return (
            <div className="flex h-full w-full items-center justify-center p-4">
                <Card className="w-full max-w-md text-center">
                    <CardContent className="p-6">
                        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
                        <h2 className="mt-4 text-xl font-semibold">Could not load Pay Stub</h2>
                        <p className="mt-2 text-muted-foreground">{error || "An unknown error occurred."}</p>
                        <Button className="mt-6" onClick={() => router.push('/accounting/payroll/history')}>
                             <ArrowLeft className="mr-2 h-4 w-4" />
                            Return to Payroll History
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    // Simplified YTD data
    const ytdGross = stubData.grossPay * 14; // Assuming 14 pay periods so far
    const ytdDeductions = stubData.deductions * 14;
    const ytdNet = stubData.netPay * 14;

    return (
        <div className="p-4 sm:p-6 space-y-4 bg-muted/30">
            <div className="flex justify-between items-center max-w-4xl mx-auto print:hidden">
                 <Button variant="outline" onClick={() => router.push('/accounting/payroll/history')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Payroll History
                </Button>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4"/> Print Stub</Button>
                    <Button onClick={handleSendEmail}><Mail className="mr-2 h-4 w-4"/> Email Stub</Button>
                </div>
            </div>
             <Card id="pay-stub-preview" ref={contentRef} className="max-w-4xl mx-auto">
                <CardContent className="p-8">
                    <header className="flex justify-between items-start pb-6 border-b">
                        <div>
                            <h2 className="text-xl font-bold">{stubData.companyName}</h2>
                            <p className="text-xs text-muted-foreground">{stubData.companyAddress}</p>
                        </div>
                        <div className="text-right">
                            <h1 className="text-2xl font-bold uppercase text-gray-700">Pay Statement</h1>
                        </div>
                    </header>
                    <section className="grid grid-cols-2 gap-8 mt-6 text-sm">
                        <div>
                            <h3 className="font-bold text-gray-500 uppercase mb-2">Employee</h3>
                            <p className="font-semibold">{stubData.employeeName}</p>
                            <p className="text-muted-foreground">{stubData.employeeAddress}</p>
                        </div>
                        <div className="text-right bg-muted/50 p-3 rounded-md">
                            <p><span className="font-bold text-gray-500">Pay Date:</span> {format(parseISO(stubData.payDate), 'PP')}</p>
                            <p><span className="font-bold text-gray-500">Pay Period:</span> {format(parseISO(stubData.payPeriod.from), 'PP')} - {format(parseISO(stubData.payPeriod.to), 'PP')}</p>
                        </div>
                    </section>
                    <section className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div>
                            <h4 className="font-semibold text-gray-600 mb-2 pb-1 border-b">Earnings</h4>
                             <Table className="text-sm">
                                <TableHeader><TableRow><TableHead>Description</TableHead><TableHead className="text-right">Current</TableHead><TableHead className="text-right">YTD</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>Regular Pay</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(stubData.grossPay)}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(ytdGross)}</TableCell>
                                    </TableRow>
                                </TableBody>
                                <TableFooter>
                                    <TableRow className="font-bold bg-muted/50"><TableCell>Gross Pay</TableCell><TableCell className="text-right font-mono">{formatCurrency(stubData.grossPay)}</TableCell><TableCell className="text-right font-mono">{formatCurrency(ytdGross)}</TableCell></TableRow>
                                </TableFooter>
                            </Table>
                         </div>
                         <div>
                            <h4 className="font-semibold text-gray-600 mb-2 pb-1 border-b">Deductions</h4>
                            <Table className="text-sm">
                                <TableHeader><TableRow><TableHead>Description</TableHead><TableHead className="text-right">Current</TableHead><TableHead className="text-right">YTD</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    <TableRow><TableCell>Income Tax</TableCell><TableCell className="text-right font-mono">{formatCurrency(stubData.deductions * 0.6)}</TableCell><TableCell className="text-right font-mono">{formatCurrency(ytdDeductions * 0.6)}</TableCell></TableRow>
                                    <TableRow><TableCell>EI</TableCell><TableCell className="text-right font-mono">{formatCurrency(stubData.deductions * 0.2)}</TableCell><TableCell className="text-right font-mono">{formatCurrency(ytdDeductions * 0.2)}</TableCell></TableRow>
                                    <TableRow><TableCell>CPP</TableCell><TableCell className="text-right font-mono">{formatCurrency(stubData.deductions * 0.2)}</TableCell><TableCell className="text-right font-mono">{formatCurrency(ytdDeductions * 0.2)}</TableCell></TableRow>
                                </TableBody>
                                <TableFooter>
                                    <TableRow className="font-bold bg-muted/50"><TableCell>Total Deductions</TableCell><TableCell className="text-right font-mono">{formatCurrency(stubData.deductions)}</TableCell><TableCell className="text-right font-mono">{formatCurrency(ytdDeductions)}</TableCell></TableRow>
                                </TableFooter>
                            </Table>
                         </div>
                    </section>
                     <section className="mt-8 pt-4 border-t">
                        <div className="w-full max-w-xs ml-auto space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-muted-foreground">Gross Pay:</span><span className="font-mono">{formatCurrency(stubData.grossPay)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Deductions:</span><span className="font-mono">({formatCurrency(stubData.deductions)})</span></div>
                            <Separator />
                            <div className="flex justify-between font-bold text-base"><span className="text-foreground">Net Pay:</span><span className="font-mono text-primary">{formatCurrency(stubData.netPay)}</span></div>
                        </div>
                     </section>
                    <footer className="mt-12 pt-6 border-t text-center text-xs text-gray-400">
                        <p>This is an official pay statement from {stubData.companyName}.</p>
                    </footer>
                </CardContent>
             </Card>
        </div>
    );
}
