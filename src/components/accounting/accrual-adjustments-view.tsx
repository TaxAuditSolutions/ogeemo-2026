
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
import { LoaderCircle, TrendingUp, TrendingDown, Printer } from 'lucide-react';
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
        setUnpaidInvoices(allInvoices.filter(inv => inv.originalAmount - inv.amountPaid > 0.001));
        setUnpaidBills(allBills); // Assuming all fetched bills are unpaid
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

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <AccountingPageHeader pageTitle="Accrual Adjustments" hubPath="/accounting" hubLabel="Accounting Hub" />
      <header className="text-center">
        <h1 className="text-3xl font-bold font-headline text-primary">
          Accrual Adjustment Report
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          A summary of your unpaid customer invoices and vendor bills for year-end accrual adjustments.
        </p>
      </header>

      <Card className="max-w-4xl mx-auto" ref={contentRef}>
        <CardHeader className="print:hidden">
          <CardTitle>How to Use This Report</CardTitle>
          <div className="text-sm text-muted-foreground pt-2">
            <p>
              This report helps bridge the gap between cash and accrual accounting for tax purposes.
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Accounts Receivable:</strong> This is income you've earned but haven't received cash for yet. Your accountant may add this amount to your income for your accrual-based tax return.</li>
              <li><strong>Accounts Payable:</strong> These are expenses you've incurred but haven't paid for yet. Your accountant may add this amount to your expenses.</li>
            </ul>
            <p className="font-semibold mt-4">
              Always consult with a professional accountant for tax advice.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <LoaderCircle className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Accounts Receivable (Unpaid Invoices)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-72">
                    <Table>
                      <TableHeader><TableRow><TableHead>Client</TableHead><TableHead>Invoice #</TableHead><TableHead>Due Date</TableHead><TableHead className="text-right">Balance Due</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {unpaidInvoices.map(inv => (
                          <TableRow key={inv.id}>
                            <TableCell>{inv.companyName}</TableCell>
                            <TableCell>{inv.invoiceNumber}</TableCell>
                            <TableCell>{format(inv.dueDate, 'PP')}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(inv.originalAmount - inv.amountPaid)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell colSpan={3} className="text-right font-bold">Total Receivable</TableCell>
                          <TableCell className="text-right font-bold font-mono">{formatCurrency(totalReceivables)}</TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                    Accounts Payable (Unpaid Bills)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-72">
                    <Table>
                      <TableHeader><TableRow><TableHead>Vendor</TableHead><TableHead>Invoice #</TableHead><TableHead>Due Date</TableHead><TableHead className="text-right">Amount Due</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {unpaidBills.map(bill => (
                          <TableRow key={bill.id}>
                            <TableCell>{bill.vendor}</TableCell>
                            <TableCell>{bill.invoiceNumber}</TableCell>
                            <TableCell>{format(new Date(bill.dueDate), 'PP')}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(bill.totalAmount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell colSpan={3} className="text-right font-bold">Total Payable</TableCell>
                          <TableCell className="text-right font-bold font-mono">{formatCurrency(totalPayables)}</TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
        <CardFooter className="print:hidden">
            <Button onClick={handlePrint} className="ml-auto">
                <Printer className="mr-2 h-4 w-4" /> Print Report
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
