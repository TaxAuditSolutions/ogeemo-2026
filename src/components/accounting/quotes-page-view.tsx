'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { LoaderCircle, CheckCircle, MoreVertical, Pencil, FileDigit, Trash2, ArrowUpDown, ClipboardList, Inbox, Send, FileText, XCircle, Receipt, Plus, TrendingUp, Wrench, CheckCheck, DollarSign, LayoutGrid, Info } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getQuotes, type Quote, type QuoteStatus, convertQuoteToInvoice, convertQuoteToWorkOrder, updateQuoteStatus, deleteQuote } from '@/core/accounting-service';
import { InvoicePageHeader } from '@/components/accounting/invoice-page-header';
import { Badge } from '@/components/ui/badge';

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const statusBadgeConfig: Record<QuoteStatus, { label: string; className: string; icon: React.ElementType }> = {
  requested: { label: 'Requested', className: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100', icon: Inbox },
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100', icon: FileText },
  sent: { label: 'Sent', className: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100', icon: Send },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100', icon: CheckCircle },
  declined: { label: 'Declined', className: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100', icon: XCircle },
  invoiced: { label: 'Invoiced', className: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100', icon: Receipt },
  in_progress: { label: 'Work in Progress', className: 'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-100', icon: Wrench },
  completed: { label: 'Completed', className: 'bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-100', icon: CheckCheck },
  paid: { label: 'Paid', className: 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100', icon: DollarSign },
};

const StatusBadge = ({ status }: { status: QuoteStatus }) => {
  const config = statusBadgeConfig[status] || { label: status, className: '', icon: FileText };
  return (
    <Badge variant="outline" className={`capitalize ${config.className}`}>
      {config.label}
    </Badge>
  );
};

export function QuotesPageView() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConverting, setIsConverting] = useState<string | null>(null);
  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof Quote>('quoteDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all');

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

  // Status summary counts
  const statusCounts = useMemo(() => {
    const counts: Record<QuoteStatus, number> = {
      requested: 0,
      draft: 0,
      sent: 0,
      approved: 0,
      declined: 0,
      invoiced: 0,
      in_progress: 0,
      completed: 0,
      paid: 0,
    };
    quotes.forEach(q => {
      if (counts[q.status] !== undefined) counts[q.status]++;
    });
    return counts;
  }, [quotes]);

  const filteredQuotes = useMemo(() => {
    let result = quotes;
    if (statusFilter !== 'all') {
      result = result.filter(q => q.status === statusFilter);
    }
    if (!searchQuery) return result;
    const lowerQuery = searchQuery.toLowerCase();
    return result.filter(q => 
      q.quoteNumber.toLowerCase().includes(lowerQuery) ||
      q.companyName.toLowerCase().includes(lowerQuery) ||
      q.status.toLowerCase().includes(lowerQuery) ||
      (q.workOrderNumber?.toLowerCase().includes(lowerQuery) ?? false)
    );
  }, [quotes, searchQuery, statusFilter]);

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

  const totalPipelineValue = useMemo(() => {
    return quotes
      .filter(q => q.status === 'requested' || q.status === 'draft' || q.status === 'sent' || q.status === 'approved' || q.status === 'in_progress' || q.status === 'completed')
      .reduce((sum, quote) => sum + quote.totalAmount, 0);
  }, [quotes]);

  const statusCards: { status: QuoteStatus; label: string; icon: React.ElementType; cardClass: string; iconClass: string }[] = [
    { status: 'requested', label: 'Requested', icon: Inbox, cardClass: 'border-amber-200 bg-amber-50', iconClass: 'text-amber-600 bg-amber-100' },
    { status: 'draft', label: 'Draft', icon: FileText, cardClass: 'border-gray-200 bg-gray-50', iconClass: 'text-gray-600 bg-gray-100' },
    { status: 'sent', label: 'Sent', icon: Send, cardClass: 'border-blue-200 bg-blue-50', iconClass: 'text-blue-600 bg-blue-100' },
    { status: 'approved', label: 'Approved', icon: CheckCircle, cardClass: 'border-green-200 bg-green-50', iconClass: 'text-green-600 bg-green-100' },
    { status: 'invoiced', label: 'Invoiced', icon: Receipt, cardClass: 'border-purple-200 bg-purple-50', iconClass: 'text-purple-600 bg-purple-100' },
    { status: 'in_progress', label: 'In Progress', icon: Wrench, cardClass: 'border-indigo-200 bg-indigo-50', iconClass: 'text-indigo-600 bg-indigo-100' },
    { status: 'completed', label: 'Completed', icon: CheckCheck, cardClass: 'border-teal-200 bg-teal-50', iconClass: 'text-teal-600 bg-teal-100' },
    { status: 'paid', label: 'Paid', icon: DollarSign, cardClass: 'border-emerald-200 bg-emerald-50', iconClass: 'text-emerald-600 bg-emerald-100' },
    { status: 'declined', label: 'Declined', icon: XCircle, cardClass: 'border-red-200 bg-red-50', iconClass: 'text-red-600 bg-red-100' },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <InvoicePageHeader pageTitle="Quote Manager" hubPath="/accounting" hubLabel="Quotes" />
      
      {/* Header with Action Buttons */}
      <header className="flex flex-col items-center gap-4 text-center">
        <div className="w-full">
          <h1 className="text-3xl font-bold font-headline text-primary flex items-center justify-center gap-2">
            Quote Manager
            <Link href="/accounting/quotes/instructions" className="inline-flex">
              <Info className="h-6 w-6 text-muted-foreground hover:text-primary transition-colors" />
            </Link>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Track proposals and convert accepted quotes into invoices with one click.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCreateNewQuote} className="font-bold">
            <Plus className="mr-2 h-4 w-4" /> Create Quote
          </Button>
        </div>
      </header>

      {/* Pipeline Value Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
        <Card className="md:col-span-1 border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Pipeline Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalPipelineValue)}</p>
            <p className="text-xs text-muted-foreground mt-1">Active quotes (Requested → Approved)</p>
          </CardContent>
        </Card>
        <Card className="md:col-span-1 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Filtered Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalQuotes)}</p>
            <p className="text-xs text-muted-foreground mt-1">{filteredQuotes.length} quotes in view</p>
          </CardContent>
        </Card>
        <Card className="md:col-span-1 flex flex-col justify-center px-6 bg-muted/30">
          <p className="text-sm text-muted-foreground italic">
            Keep prospects moving through the pipeline. Accepted quotes may be converted into invoices to preserve your accounting history.
          </p>
        </Card>
      </div>

      {/* Status Summary Cards - Clickable for filtering */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card 
          key="all"
          className={`cursor-pointer transition-all hover:shadow-md border-primary/30 bg-primary/5 ${statusFilter === 'all' ? 'ring-2 ring-primary ring-offset-1' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 bg-primary/10 text-primary">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold leading-none">{quotes.length}</p>
              <p className="text-xs text-muted-foreground mt-1 truncate">All Quotes</p>
            </div>
          </CardContent>
        </Card>
        {statusCards.map(({ status, label, icon: Icon, cardClass, iconClass }) => {
          const isActive = statusFilter === status;
          return (
            <Card 
              key={status} 
              className={`cursor-pointer transition-all hover:shadow-md ${cardClass} ${isActive ? 'ring-2 ring-primary ring-offset-1' : ''}`}
              onClick={() => setStatusFilter(isActive ? 'all' : status)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold leading-none">{statusCounts[status]}</p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quote Pipeline Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Quote Pipeline</CardTitle>
            <div className="text-sm text-muted-foreground">
              {statusFilter !== 'all' ? (
                <span className="flex items-center gap-2">
                  Filtered by: <StatusBadge status={statusFilter} />
                  <button onClick={() => setStatusFilter('all')} className="text-xs text-primary underline hover:no-underline">Clear filter</button>
                </span>
              ) : (
                'Manage quote status, accept proposals, and convert them to invoices.'
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input 
              placeholder="Search quotes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64"
            />
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
                  <TableHead>Work Order #</TableHead>
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
                  <TableRow key={quote.id} className="group">
                    <TableCell className="font-medium">{quote.quoteNumber}</TableCell>
                    <TableCell className="text-muted-foreground">{quote.workOrderNumber || '—'}</TableCell>
                    <TableCell>{quote.companyName}</TableCell>
                    <TableCell>{format(quote.quoteDate, 'PP')}</TableCell>
                    <TableCell><StatusBadge status={quote.status} /></TableCell>
                    <TableCell className="text-right font-mono text-primary">{formatCurrency(quote.totalAmount)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-1">
                        {/* Quick Action Buttons - visible on hover */}
                        <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {quote.status !== 'approved' && quote.status !== 'invoiced' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleAcceptQuote(quote.id)}
                              title="Mark Approved"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {quote.status === 'approved' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                              onClick={() => handleConvertQuote(quote.id)}
                              title="Convert to Invoice"
                            >
                              <Receipt className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => handleEditQuote(quote.id)}
                            title="Edit Quote"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {/* Full Dropdown Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
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
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleUpdateStatus(quote.id, 'requested')}>
                              <Inbox className="mr-2 h-4 w-4" /> Mark as Requested
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(quote.id, 'draft')}>
                              <FileText className="mr-2 h-4 w-4" /> Mark as Draft
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(quote.id, 'sent')}>
                              <Send className="mr-2 h-4 w-4" /> Mark as Sent
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(quote.id, 'in_progress')}>
                              <Wrench className="mr-2 h-4 w-4" /> Mark as Work in Progress
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(quote.id, 'completed')}>
                              <CheckCheck className="mr-2 h-4 w-4" /> Mark as Completed
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(quote.id, 'invoiced')}>
                              <Receipt className="mr-2 h-4 w-4" /> Mark as Invoiced
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(quote.id, 'paid')}>
                              <DollarSign className="mr-2 h-4 w-4" /> Mark as Paid
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(quote.id, 'declined')}>
                              <XCircle className="mr-2 h-4 w-4" /> Mark as Declined
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
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
                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground italic">
                      {statusFilter !== 'all' 
                        ? `No ${statusFilter} quotes found. Try clearing the filter or create a new quote.`
                        : 'No quotes found. Create a new quote to get started.'}
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