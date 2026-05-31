'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LoaderCircle, CheckCircle, MoreVertical, Pencil, FileDigit } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getQuotes, type Quote, convertQuoteToInvoice, updateQuoteStatus } from '@/core/accounting-service';
import { InvoicePageHeader } from '@/components/accounting/invoice-page-header';

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

export function QuotesPageView() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(null);

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
      await updateQuoteStatus(quoteId, 'accepted', user.uid);
      toast({ title: 'Quote Accepted', description: 'The quote is now marked as accepted and ready to invoice.' });
      loadData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Accept Failed', description: error.message });
    } finally {
      setIsSaving(false);
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

  const totalQuotes = useMemo(() => {
    return quotes.reduce((sum, quote) => sum + quote.totalAmount, 0);
  }, [quotes]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <InvoicePageHeader pageTitle="Quotes" hubPath="/accounting/quotes" hubLabel="Quotes" />
      <header className="text-center">
        <h1 className="text-3xl font-bold font-headline text-primary">Quotes</h1>
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
          <div className="flex gap-2">
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
                  <TableHead>Quote #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.length > 0 ? quotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="font-medium">{quote.quoteNumber}</TableCell>
                    <TableCell>{quote.companyName}</TableCell>
                    <TableCell>{format(quote.quoteDate, 'PP')}</TableCell>
                    <TableCell>{quote.status}</TableCell>
                    <TableCell className="text-right font-mono text-primary">{formatCurrency(quote.totalAmount)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {quote.status === 'accepted' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-primary text-primary hover:bg-primary/5"
                            onClick={() => handleConvertQuote(quote.id)}
                            disabled={isSaving && activeQuoteId === quote.id}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" /> Convert
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-primary text-primary hover:bg-primary/5"
                            onClick={() => handleAcceptQuote(quote.id)}
                            disabled={isSaving}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" /> Accept
                          </Button>
                        )}
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
