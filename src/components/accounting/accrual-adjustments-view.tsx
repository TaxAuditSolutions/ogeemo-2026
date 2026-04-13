'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  TableFooter,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { LoaderCircle, TrendingUp, TrendingDown, Printer, Scale, Info, FileDigit, FileInput } from 'lucide-react';
import { AccountingPageHeader } from '@/components/accounting/page-header';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import {
  getInvoices,
  getPayableBills,
  type Invoice,
  type PayableBill,
} from '@/core/accounting-service';
import { format } from 'date-fns';
import { useReactToPrint } from '@/hooks/use-react-to-print';
import { Separator } from '../ui/separator';
import { cn } from '@/lib/utils';

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

export function AccrualAdjustmentsView() {
  const [unpaidInvoices, setUnpaidInvoices] = useState<Invoice[]>([]);
  const [unpaidBills, setUnpaidBills] = useState<PayableBill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const { handlePrint, contentRef } = useReactToPrint();

  useEffect(() => {
    async function loadData() {
      if (!user) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const [allInvoices, allBills] = await Promise.all([
          getInvoices(user.uid),
          getPayableBills(user.uid),
        ]);
        // Source of Truth for AR: Invoices with an outstanding balance
        setUnpaidInvoices(allInvoices.filter(inv => inv.originalAmount - inv.amountPaid > 0.001));
        // Source of Truth for AP: All records in the payableBills collection (which are deleted once paid)
        setUnpaidBills(allBills); 
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Failed to load report data',
          description: error.message,
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [user, toast]);

  const totalReceivables = useMemo(() => {
    return unpaidInvoices.reduce((sum, inv) => sum + (inv.originalAmount - inv.amountPaid), 0);
  }, [unpaidInvoices]);

  const totalPayables = useMemo(() => {
    return unpaidBills.reduce((sum, bill) => sum + bill.totalAmount, 0);
  }, [unpaidBills]);

  const netAdjustment = totalReceivables - totalPayables;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <AccountingPageHeader pageTitle="Accrual Adjustments" hubPath="/accounting" hubLabel="Accounting Hub" />
      <header className="text-center print:hidden">
        <h1 className="text-3xl font-bold font-headline text-primary uppercase tracking-tight">
          Accrual Adjustment Report
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Synchronizing your cash-basis BKS Ledger with year-end accrual requirements.
        </p>
      </header>

      <div className="max-w-5xl mx-auto space-y-8" ref={contentRef}>
        {/* Print Header */}
        <div className="hidden print:block text-center mb-8 border-b pb-4">
            <h1 className="text-3xl font-bold">Ogeemo Accrual Adjustments</h1>
            <p className="text-muted-foreground">Generated on {format(new Date(), 'PPPP')}</p>
            <p className="text-xs mt-2 uppercase font-bold text-primary">Source: Accounts Receivable & Accounts Payable Managers</p>
        </div>

        {/* Summary Card */}
        <Card className="border-2 border-primary/20 shadow-xl overflow-hidden">
            <CardHeader className="bg-primary/5 border-b">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Scale className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Net Accrual Delta</CardTitle>
                            <CardDescription>Total adjustment to your cash-basis net profit.</CardDescription>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className={cn("text-3xl font-bold font-mono", netAdjustment >= 0 ? "text-primary" : "text-destructive")}>
                            {formatCurrency(netAdjustment)}
                        </p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground flex items-center gap-2">
                                <FileDigit className="h-4 w-4 text-green-600" />
                                Accounts Receivable (Unpaid)
                            </span>
                            <span className="font-mono font-bold text-green-600">+{formatCurrency(totalReceivables)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground flex items-center gap-2">
                                <FileInput className="h-4 w-4 text-red-600" />
                                Accounts Payable (Unpaid)
                            </span>
                            <span className="font-mono font-bold text-red-600">-{formatCurrency(totalPayables)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center font-bold text-lg">
                            <span>Year-End Adjustment</span>
                            <span className={cn("font-mono", netAdjustment >= 0 ? "text-primary" : "text-destructive")}>
                                {formatCurrency(netAdjustment)}
                            </span>
                        </div>
                    </div>
                    <div className="bg-muted/30 p-4 rounded-lg border border-dashed text-xs text-muted-foreground space-y-3">
                        <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest">
                            <Info className="h-3 w-3" />
                            The Source of Truth
                        </div>
                        <p>
                            This report pulls data directly from your **Accounts Receivable** and **Accounts Payable** managers. 
                        </p>
                        <p>
                            **A/R** represents income earned but not yet received in your bank. **A/P** represents expenses incurred but not yet paid from your bank. 
                        </p>
                        <p className="font-semibold text-foreground">
                            When you "Post Payment" in those managers, the item is removed from this report and recorded in the BKS General Ledger.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>

        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-4">
            <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Syncing AR and AP buffers...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Receivables Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Outstanding Receivables
                    </CardTitle>
                    <CardDescription>Income earned but not yet posted to the GL.</CardDescription>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Source: A/R Manager</p>
                </div>
              </CardHeader>
              <CardContent className="p-0 border-t">
                  <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Client</TableHead>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead className="text-right">Balance Due</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unpaidInvoices.length > 0 ? unpaidInvoices.map(inv => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium">{inv.companyName}</TableCell>
                          <TableCell>{inv.invoiceNumber}</TableCell>
                          <TableCell>{format(inv.dueDate, 'PP')}</TableCell>
                          <TableCell className="text-right font-mono text-green-600">{formatCurrency(inv.originalAmount - inv.amountPaid)}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">No outstanding receivables found in the A/R Manager.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                    {unpaidInvoices.length > 0 && (
                        <TableFooter>
                            <TableRow className="bg-primary/5">
                                <TableCell colSpan={3} className="text-right font-bold uppercase text-[10px] tracking-widest">Subtotal A/R</TableCell>
                                <TableCell className="text-right font-bold font-mono text-green-600">{formatCurrency(totalReceivables)}</TableCell>
                            </TableRow>
                        </TableFooter>
                    )}
                  </Table>
              </CardContent>
            </Card>

            {/* Payables Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                    Outstanding Payables
                    </CardTitle>
                    <CardDescription>Expenses incurred but not yet posted to the GL.</CardDescription>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Source: A/P Manager</p>
                </div>
              </CardHeader>
              <CardContent className="p-0 border-t">
                  <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Vendor</TableHead>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead className="text-right">Amount Due</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unpaidBills.length > 0 ? unpaidBills.map(bill => (
                        <TableRow key={bill.id}>
                          <TableCell className="font-medium">{bill.vendor}</TableCell>
                          <TableCell>{bill.invoiceNumber || 'N/A'}</TableCell>
                          <TableCell>{format(new Date(bill.dueDate), 'PP')}</TableCell>
                          <TableCell className="text-right font-mono text-red-600">{formatCurrency(bill.totalAmount)}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">No outstanding payables found in the A/P Manager.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                    {unpaidBills.length > 0 && (
                        <TableFooter>
                            <TableRow className="bg-destructive/5">
                                <TableCell colSpan={3} className="text-right font-bold uppercase text-[10px] tracking-widest">Subtotal A/P</TableCell>
                                <TableCell className="text-right font-bold font-mono text-red-600">{formatCurrency(totalPayables)}</TableCell>
                            </TableRow>
                        </TableFooter>
                    )}
                  </Table>
              </CardContent>
            </Card>
          </div>
        )}
        
        <CardFooter className="print:hidden justify-end border-t pt-6 gap-4">
            <p className="text-xs text-muted-foreground italic max-w-sm text-right">
                This report calculates the required accrual adjustments based on current A/R and A/P buffers.
            </p>
            <Button onClick={handlePrint} variant="outline" disabled={isLoading}>
                <Printer className="mr-2 h-4 w-4" /> Print Adjustment Report
            </Button>
        </CardFooter>
      </div>
    </div>
  );
}
