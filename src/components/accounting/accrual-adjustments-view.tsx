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
import { LoaderCircle, TrendingUp, TrendingDown, Printer, Scale, Info } from 'lucide-react';
import { AccountingPageHeader } from '@/components/accounting/page-header';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import {
  getInvoices,
  getPayableBills,
  type Invoice,
  type PayableBill,
} from '@/services/accounting-service';
import { format } from 'date-fns';
import { useReactToPrint } from '@/hooks/use-react-to-print';
import { ScrollArea } from '../ui/scroll-area';
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
        // Filter for invoices that still have a balance due
        setUnpaidInvoices(allInvoices.filter(inv => inv.originalAmount - inv.amountPaid > 0.001));
        setUnpaidBills(allBills); 
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Failed to load data',
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
        <h1 className="text-3xl font-bold font-headline text-primary">
          Accrual Adjustment Report
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Bridge the gap between your cash-basis records and accrual-basis reporting.
        </p>
      </header>

      <div className="max-w-5xl mx-auto space-y-8" ref={contentRef}>
        {/* Print Header */}
        <div className="hidden print:block text-center mb-8 border-b pb-4">
            <h1 className="text-3xl font-bold">Ogeemo Accrual Adjustments</h1>
            <p className="text-muted-foreground">Generated on {format(new Date(), 'PPPP')}</p>
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
                            <CardTitle>Net Accrual Adjustment</CardTitle>
                            <CardDescription>The total "Delta" for your tax preparation.</CardDescription>
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
                                <TrendingUp className="h-4 w-4 text-green-600" />
                                Accounts Receivable (Unpaid)
                            </span>
                            <span className="font-mono font-bold text-green-600">+{formatCurrency(totalReceivables)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground flex items-center gap-2">
                                <TrendingDown className="h-4 w-4 text-red-600" />
                                Accounts Payable (Unpaid)
                            </span>
                            <span className="font-mono font-bold text-red-600">-{formatCurrency(totalPayables)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center font-bold">
                            <span>Final Adjustment</span>
                            <span className="font-mono">{formatCurrency(netAdjustment)}</span>
                        </div>
                    </div>
                    <div className="bg-muted/30 p-4 rounded-lg border border-dashed text-xs text-muted-foreground space-y-2">
                        <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest">
                            <Info className="h-3 w-3" />
                            Accountant's Guide
                        </div>
                        <p>
                            While Ogeemo's ledger is cash-basis, this report provides the accrual adjustments required for Year-End filings. 
                        </p>
                        <p>
                            <strong>A/R</strong> represents income earned but not received. <strong>A/P</strong> represents expenses incurred but not paid. The Net Adjustment is the amount added to your cash-basis profit to reach an accrual-basis result.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>

        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-4">
            <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Aggregating unpaid items...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Receivables Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Receivables Audit Trail
                </CardTitle>
                <CardDescription>Outstanding invoices owed to your business.</CardDescription>
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
                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No outstanding receivables found.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                    {unpaidInvoices.length > 0 && (
                        <TableFooter>
                            <TableRow>
                                <TableCell colSpan={3} className="text-right font-bold">Total Receivables</TableCell>
                                <TableCell className="text-right font-bold font-mono text-green-600">{formatCurrency(totalReceivables)}</TableCell>
                            </TableRow>
                        </TableFooter>
                    )}
                  </Table>
              </CardContent>
            </Card>

            {/* Payables Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  Payables Audit Trail
                </CardTitle>
                <CardDescription>Outstanding bills your business owes.</CardDescription>
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
                          <TableCell>{bill.invoiceNumber}</TableCell>
                          <TableCell>{format(new Date(bill.dueDate), 'PP')}</TableCell>
                          <TableCell className="text-right font-mono text-red-600">{formatCurrency(bill.totalAmount)}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No outstanding payables found.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                    {unpaidBills.length > 0 && (
                        <TableFooter>
                            <TableRow>
                                <TableCell colSpan={3} className="text-right font-bold">Total Payables</TableCell>
                                <TableCell className="text-right font-bold font-mono text-red-600">{formatCurrency(totalPayables)}</TableCell>
                            </TableRow>
                        </TableFooter>
                    )}
                  </Table>
              </CardContent>
            </Card>
          </div>
        )}
        
        <CardFooter className="print:hidden justify-end">
            <Button onClick={handlePrint} variant="outline" disabled={isLoading}>
                <Printer className="mr-2 h-4 w-4" /> Print Adjustment Report
            </Button>
        </CardFooter>
      </div>
    </div>
  );
}
