'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LoaderCircle, CheckCircle, MoreVertical, Pencil, FileDigit, Trash2, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getQuotes, type Quote, convertQuoteToInvoice, convertQuoteToWorkOrder, updateQuoteStatus, deleteQuote } from '@/core/accounting-service';
import { InvoicePageHeader } from '@/components/accounting/invoice-page-header';

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

export function QuotesPageView() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof Quote>('quoteDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');

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
      const allQuotes = await getQuotes(user.uid);
      setQuotes(allQuotes);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Unable to load quotes', description: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateNewQuote = () => {
    localStorage.removeItem('editQuoteId');
    router.push('/accounting/quotes/create');
  };

  const handleEditQuote = (quoteId: string) => {
    localStorage.setItem('editQuoteId', quoteId);
    router.push('/accounting/quotes/create');
  };

  const handleAcceptQuote = async (quoteId: string) => {
    if (!user) return;
    setIsSaving(true);
    try {
      await updateQuoteStatus(quoteId, 'approved', user.uid);
      toast({ title: 'Quote Approved', description: 'The quote is now marked as approved and ready to invoice.' });
      loadData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Approve Failed', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStatus = async (quoteId: string, status: string) => {
    if (!user) return;
    setIsSaving(true);
    try {
      await updateQuoteStatus(quoteId, status as any, user.uid);
      toast({ title: 'Status Updated', description: `Quote status changed to ${status}.` });
      loadData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteQuote = async (quoteId: string) => {
    if (!user || !window.confirm("Are you sure you want to permanently delete this quote?")) return;
    setIsSaving(true);
    try {
      await deleteQuote(user.uid, quoteId);
      toast({ title: 'Quote Deleted', description: 'The quote has been permanently removed.' });
      loadData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConvertToWorkOrder = async (quoteId: string) => {
    if (!user) return;
    setIsConverting(quoteId);
    try {
      const wo = await convertQuoteToWorkOrder(quoteId, user.uid);
      toast({ title: "Work Order Created", description: `Work order ${wo.workOrderNumber} has been created from this quote.` });
      loadData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Conversion Failed", description: error.message });
    } finally {
      setIsConverting(null);
    }
  };

  const handleConvertQuote = async (quoteId: string) => {
    if (!user) return;
    setIsSaving(true);
    setActiveQuoteId(quoteId);
    try {
      await convertQuoteToInvoice(quoteId, user.uid);
      toast({ title: 'Quote Converted', description: 'The accepted quote has been converted into an invoice.' });
      router.push('/accounting/accounts-receivable');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Conversion Failed', description: error.message });
    } finally {
      setActiveQuoteId(null);
      setIsSaving(false);
    }
  };

  const handleAcceptAndConvertQuote = async (quoteId: string) => {
    if (!user) return;
    setIsSaving(true);
    setActiveQuoteId(quoteId);
    try {
      await updateQuoteStatus(quoteId, 'approved', user.uid);
      await convertQuoteToInvoice(quoteId, user.uid);
      toast({ title: 'Quote Approved & Converted', description: 'The quote was approved and converted into an invoice.' });
      router.push('/accounting/accounts-receivable');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Action Failed', description: error.message });
      setIsSaving(false);
      setActiveQuoteId(null);
    }
  };

  const handleSort = (field: keyof Quote) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const filteredQuotes = useMemo(() => {
    if (!searchQuery) return quotes;
    const lowerQuery = searchQuery.toLowerCase();
    return quotes.filter(q => 
      q.quoteNumber.toLowerCase().includes(lowerQuery) ||
      q.companyName.toLowerCase().includes(lowerQuery) ||
      q.status.toLowerCase().includes(lowerQuery)
    );
  }, [quotes, searchQuery]);

  const sortedQuotes = useMemo(() => {
    return [...filteredQuotes].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (aVal instanceof Date && bVal instanceof Date) {
        return sortDir === 'asc' ? aVal.getTime() - bVal.getTime() : bVal.getTime() - aVal.getTime();
      }
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      return 0;
    });
  }, [filteredQuotes, sortField, sortDir]);

  const totalQuotes = useMemo(() => {
    return filteredQuotes.reduce((sum, quote) => sum + quote.totalAmount, 0);
  }, [filteredQuotes]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <InvoicePageHeader pageTitle="Quote Manager" hubPath="/accounting/quotes" hubLabel="Quotes" />
      <header className="text-center">
        <h1 className="text-3xl font-bold font-headline text-primary">Quote Manager</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Track proposals and convert accepted quotes into invoices with one click.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
        <Card className="md:col-span-1 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Open Quote Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalQuotes)}</p>
          </CardContent>
        </Card>
        <Card className="md:col-span-2 flex flex-col justify-center px-6 bg-muted/30">
          <p className="text-sm text-muted-foreground italic">
            Keep prospects moving through the pipeline. Accepted quotes may be converted into invoices to preserve your accounting history.
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Quote Pipeline</CardTitle>
            <CardDescription>Manage quote status, accept proposals, and convert them to invoices.</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input 
              placeholder="Search quotes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64"
            />
            <Button variant="outline" onClick={handleCreateNewQuote}>
              <FileDigit className="mr-2 h-4 w-4" /> Create Quote
            </Button>
          </div>
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
                  <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('quoteNumber')}>
                    Quote # <ArrowUpDown className="ml-1 h-3 w-3 inline" />
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('companyName')}>
                    Client <ArrowUpDown className="ml-1 h-3 w-3 inline" />
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('quoteDate')}>
                    Date <ArrowUpDown className="ml-1 h-3 w-3 inline" />
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('status')}>
                    Status <ArrowUpDown className="ml-1 h-3 w-3 inline" />
                  </TableHead>
                  <TableHead className="text-right cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('totalAmount')}>
                    Amount <ArrowUpDown className="ml-1 h-3 w-3 inline" />
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedQuotes.length > 0 ? sortedQuotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="font-medium">{quote.quoteNumber}</TableCell>
                    <TableCell>{quote.companyName}</TableCell>
                    <TableCell>{format(quote.quoteDate, 'PP')}</TableCell>
                    <TableCell>{quote.status}</TableCell>
                    <TableCell className="text-right font-mono text-primary">{formatCurrency(quote.totalAmount)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditQuote(quote.id)}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit Quote
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAcceptQuote(quote.id)}>
                              <CheckCircle className="mr-2 h-4 w-4" /> Mark Approved
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleConvertQuote(quote.id)}>
                              <FileDigit className="mr-2 h-4 w-4" /> Convert to Invoice</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleConvertToWorkOrder(quote.id)}>
                              <ClipboardList className="mr-2 h-4 w-4" /> Convert to Work Order
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAcceptAndConvertQuote(quote.id)}>
                              <CheckCircle className="mr-2 h-4 w-4" /> Approve and Create an Invoice
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(quote.id, 'draft')}>
                              Mark as Draft
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(quote.id, 'sent')}>
                              Mark as Sent
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(quote.id, 'invoiced')}>
                              Mark as Invoiced
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(quote.id, 'declined')}>
                              Mark as Declined
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteQuote(quote.id)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Quote
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground italic">
                      No quotes found. Create a new quote to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
