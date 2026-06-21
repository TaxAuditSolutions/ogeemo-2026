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
import { Input } from '@/components/ui/input';
import { LoaderCircle, TrendingUp, TrendingDown, Printer, Scale, Info, FileDigit, FileInput, ArrowUpDown } from 'lucide-react';
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
  
  const [searchQuery, setSearchQuery] = useState('');
  
  const [arSortField, setArSortField] = useState<keyof Invoice>('dueDate');
  const [arSortDir, setArSortDir] = useState<'asc' | 'desc'>('asc');

  const [apSortField, setApSortField] = useState<keyof PayableBill>('dueDate');
  const [apSortDir, setApSortDir] = useState<'asc' | 'desc'>('asc');

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

  const filteredAR = useMemo(() => {
    if (!searchQuery) return unpaidInvoices;
    const lowerQuery = searchQuery.toLowerCase();
    return unpaidInvoices.filter(inv => 
      (inv.companyName || '').toLowerCase().includes(lowerQuery) ||
      (inv.invoiceNumber || '').toLowerCase().includes(lowerQuery)
    );
  }, [unpaidInvoices, searchQuery]);

  const filteredAP = useMemo(() => {
    if (!searchQuery) return unpaidBills;
    const lowerQuery = searchQuery.toLowerCase();
    return unpaidBills.filter(bill => 
      (bill.vendor || '').toLowerCase().includes(lowerQuery) ||
      (bill.invoiceNumber || '').toLowerCase().includes(lowerQuery)
    );
  }, [unpaidBills, searchQuery]);

  const handleSortAR = (field: keyof Invoice) => {
    if (arSortField === field) {
      setArSortDir(arSortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setArSortField(field);
      setArSortDir('asc');
    }
  };

  const handleSortAP = (field: keyof PayableBill) => {
    if (apSortField === field) {
      setApSortDir(apSortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setApSortField(field);
      setApSortDir('asc');
    }
  };

  const sortedAR = useMemo(() => {
    return [...filteredAR].sort((a, b) => {
      let aVal = a[arSortField];
      let bVal = b[arSortField];
      
      if (aVal instanceof Date && bVal instanceof Date) {
        return arSortDir === 'asc' ? aVal.getTime() - bVal.getTime() : bVal.getTime() - aVal.getTime();
      }
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return arSortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return 0;
    });
  }, [filteredAR, arSortField, arSortDir]);

  const sortedAP = useMemo(() => {
    return [...filteredAP].sort((a, b) => {
      let aVal = a[apSortField];
      let bVal = b[apSortField];
      
      if (apSortField === 'dueDate') {
         aVal = new Date(a.dueDate).getTime();
         bVal = new Date(b.dueDate).getTime();
         return apSortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return apSortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return 0;
    });
  }, [filteredAP, apSortField, apSortDir]);

  const totalReceivables = useMemo(() => {
    return sortedAR.reduce((sum, inv) => sum + (inv.originalAmount - inv.amountPaid), 0);
  }, [sortedAR]);

  const totalPayables = useMemo(() => {
    return sortedAP.reduce((sum, bill) => sum + bill.totalAmount, 0);
  }, [sortedAP]);

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
        <div className="flex justify-end print:hidden mb-4">
            <Input 
              placeholder="Search by client/vendor or invoice #..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-80"
            />
        </div>

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
                            <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSortAR('companyName')}>
                              Client <ArrowUpDown className="ml-1 h-3 w-3 inline" />
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSortAR('invoiceNumber')}>
                              Invoice # <ArrowUpDown className="ml-1 h-3 w-3 inline" />
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSortAR('dueDate')}>
                              Due Date <ArrowUpDown className="ml-1 h-3 w-3 inline" />
                            </TableHead>
                            <TableHead className="text-right">Balance Due</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedAR.length > 0 ? sortedAR.map(inv => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium">{inv.companyName}</TableCell>
                          <TableCell>{inv.invoiceNumber}</TableCell>
                          <TableCell>{format(inv.dueDate, 'PP')}</TableCell>
                          <TableCell className="text-right font-mono text-green-600">{formatCurrency(inv.originalAmount - inv.amountPaid)}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">No outstanding receivables found matching the criteria.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                    {sortedAR.length > 0 && (
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
                            <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSortAP('vendor')}>
                              Vendor <ArrowUpDown className="ml-1 h-3 w-3 inline" />
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSortAP('invoiceNumber')}>
                              Invoice # <ArrowUpDown className="ml-1 h-3 w-3 inline" />
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSortAP('dueDate')}>
                              Due Date <ArrowUpDown className="ml-1 h-3 w-3 inline" />
                            </TableHead>
                            <TableHead className="text-right">Amount Due</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedAP.length > 0 ? sortedAP.map(bill => (
                        <TableRow key={bill.id}>
                          <TableCell className="font-medium">{bill.vendor}</TableCell>
                          <TableCell>{bill.invoiceNumber || 'N/A'}</TableCell>
                          <TableCell>{format(new Date(bill.dueDate), 'PP')}</TableCell>
                          <TableCell className="text-right font-mono text-red-600">{formatCurrency(bill.totalAmount)}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">No outstanding payables found matching the criteria.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                    {sortedAP.length > 0 && (
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
