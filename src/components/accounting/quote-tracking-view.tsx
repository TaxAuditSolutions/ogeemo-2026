'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import {
    LoaderCircle, ArrowLeft, Inbox, FileText, Wrench, CheckCheck, Receipt, DollarSign,
    CheckCircle, Circle, XCircle, CircleSlash, Clock, Minus, Pencil,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { InvoicePageHeader } from '@/components/accounting/invoice-page-header';
import {
    getQuoteById, getWorkOrders, getInvoices, getIncomeTransactions,
    type Quote, type WorkOrder, type Invoice,
} from '@/core/accounting-service';
import { openInvoiceReceipt } from '@/lib/receipt-handoff';
import { cn } from '@/lib/utils';

/**
 * From Quote to Receipt Tracking: a stage-by-stage timeline for one job family
 * (Request -> Quote -> Work Order -> Completion -> Invoice -> Receipt).
 * Links resolve from the source* fields stamped by the convert functions, with
 * a legacy fallback that matches the "Converted from ..." note text.
 */
type StageOutcome = 'complete' | 'incomplete' | 'skipped' | 'declined' | 'na';
type StageState = 'done' | 'current' | 'pending' | 'skipped' | 'declined' | 'na';

interface StageRow { label: string; value: string }

interface StageDef {
    key: string;
    title: string;
    icon: React.ElementType;
    outcome: StageOutcome;
    rows: StageRow[];
    note?: string;
    content?: React.ReactNode;
    actions?: React.ReactNode;
}

const stateConfig: Record<StageState, { label: string; icon: React.ElementType; badgeClass: string; iconWrapClass: string }> = {
    done: { label: 'Done', icon: CheckCircle, badgeClass: 'bg-green-100 text-green-800 border-green-200', iconWrapClass: 'bg-green-100 text-green-700' },
    current: { label: 'In progress', icon: Clock, badgeClass: 'bg-amber-100 text-amber-800 border-amber-200', iconWrapClass: 'bg-amber-100 text-amber-700' },
    pending: { label: 'Pending', icon: Circle, badgeClass: 'bg-gray-100 text-gray-600 border-gray-200', iconWrapClass: 'bg-gray-100 text-gray-500' },
    skipped: { label: 'Skipped', icon: CircleSlash, badgeClass: 'bg-gray-100 text-gray-500 border-gray-200', iconWrapClass: 'bg-gray-100 text-gray-400' },
    declined: { label: 'Declined', icon: XCircle, badgeClass: 'bg-red-100 text-red-800 border-red-200', iconWrapClass: 'bg-red-100 text-red-700' },
    na: { label: 'Not applicable', icon: Minus, badgeClass: 'bg-gray-50 text-gray-400 border-gray-200', iconWrapClass: 'bg-gray-50 text-gray-400' },
};

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

const fmtDate = (value: any, pattern = 'PP'): string => {
    if (!value) return '—';
    try {
        const d = value instanceof Date
            ? value
            : new Date(typeof value === 'string' && value.length === 10 ? `${value}T12:00:00` : value);
        return isNaN(d.getTime()) ? '—' : format(d, pattern);
    } catch {
        return '—';
    }
};

export function QuoteTrackingView() {
    const router = useRouter();
    const params = useParams();
    const quoteId = params.quoteId as string;
    const { user, isLoading: isAuthLoading } = useAuth();
    const { toast } = useToast();

    const [isLoading, setIsLoading] = useState(true);
    const [quote, setQuote] = useState<Quote | null>(null);
    const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [payments, setPayments] = useState<Awaited<ReturnType<typeof getIncomeTransactions>>>([]);
    const [legacyMatch, setLegacyMatch] = useState(false);

    const handleOpenQuote = () => {
        if (!quote) return;
        localStorage.setItem('editQuoteId', quote.id);
        router.push('/accounting/quotes/create');
    };

    const loadData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const q = await getQuoteById(quoteId, { quiet: true }).catch(() => null);
            if (!q) {
                setQuote(null);
                return;
            }
            setQuote(q);

            const [workOrders, invoices, income] = await Promise.all([
                getWorkOrders(user.uid).catch(() => [] as WorkOrder[]),
                getInvoices(user.uid, { includeDrafts: true }).catch(() => [] as Invoice[]),
                getIncomeTransactions(user.uid).catch(() => [] as Awaited<ReturnType<typeof getIncomeTransactions>>),
            ]);

            const wo =
                (q.workOrderId ? workOrders.find(w => w.id === q.workOrderId) : undefined) ||
                workOrders.find(w => w.quoteId === q.id) ||
                (q.workOrderNumber ? workOrders.find(w => w.workOrderNumber === q.workOrderNumber) : undefined) ||
                null;
            setWorkOrder(wo);

            let inv = invoices.find(i =>
                (i.sourceQuoteId && i.sourceQuoteId === q.id) ||
                (wo && i.sourceWorkOrderId === wo.id)
            ) || null;
            let legacy = false;
            if (!inv) {
                const byWo = wo?.workOrderNumber
                    ? invoices.find(i => !i.sourceWorkOrderId && (i.notes || '').includes(`Converted from work order ${wo.workOrderNumber}`))
                    : undefined;
                const byQuote = q.quoteNumber
                    ? invoices.find(i => !i.sourceQuoteId && (i.notes || '').includes(`Converted from quote ${q.quoteNumber}`))
                    : undefined;
                inv = byWo || byQuote || null;
                legacy = !!inv;
            }
            setInvoice(inv);
            setLegacyMatch(legacy);

            const pays = inv
                ? income.filter(t => (t as any).documentNumber === inv!.invoiceNumber)
                : [];
            pays.sort((a, b) => String((a as any).date || '').localeCompare(String((b as any).date || '')));
            setPayments(pays);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Unable to load tracking', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [user, quoteId, toast]);

    useEffect(() => {
        if (!isAuthLoading) loadData();
    }, [isAuthLoading, loadData]);

    const declined = quote?.status === 'declined';
    const approvedLike = ['approved', 'in_progress', 'invoiced', 'completed', 'paid'];
    const balance = invoice ? Math.max(0, (invoice.originalAmount || 0) - (invoice.amountPaid || 0)) : 0;
    const paidInFull = !!invoice && (invoice.status === 'paid' || (invoice.amountPaid || 0) >= (invoice.originalAmount || 0) - 0.01);

    const outcomes: StageOutcome[] = quote ? [
        'complete', // 1. Request - the quote record itself is the captured request
        declined ? 'declined' : approvedLike.includes(quote.status) ? 'complete' : 'incomplete', // 2. Quote
        declined ? 'na' : workOrder ? 'complete' : invoice ? 'skipped' : 'incomplete', // 3. Work Order
        declined ? 'na' : workOrder ? (workOrder.status === 'completed' || workOrder.completedDate ? 'complete' : 'incomplete') : invoice ? 'skipped' : 'incomplete', // 4. Completion
        declined ? 'na' : invoice ? 'complete' : 'incomplete', // 5. Invoice
        declined ? 'na' : invoice ? (paidInFull ? 'complete' : 'incomplete') : 'incomplete', // 6. Receipt
    ] : [];
    const firstIncomplete = outcomes.indexOf('incomplete');
    const toState = (outcome: StageOutcome, index: number): StageState => {
        if (outcome === 'complete') return 'done';
        if (outcome === 'skipped') return 'skipped';
        if (outcome === 'declined') return 'declined';
        if (outcome === 'na') return 'na';
        return firstIncomplete === index ? 'current' : 'pending';
    };

    const stages: StageDef[] = quote ? [
        {
            key: 'request',
            title: 'Request',
            icon: Inbox,
            outcome: outcomes[0],
            rows: [
                { label: 'Received', value: fmtDate(quote.createdAt || quote.quoteDate) },
                { label: 'Client', value: quote.companyName },
            ],
            note: quote.status === 'requested' ? 'Requested — the quote has not been prepared yet.' : undefined,
        },
        {
            key: 'quote',
            title: 'Quote',
            icon: FileText,
            outcome: outcomes[1],
            rows: [
                { label: 'Quote #', value: quote.quoteNumber },
                { label: 'Custom ID', value: quote.customId || '—' },
                { label: 'Quote date', value: fmtDate(quote.quoteDate) },
                { label: 'Expires', value: fmtDate(quote.expirationDate) },
                { label: 'Amount', value: formatCurrency(quote.totalAmount) },
            ],
            note: declined
                ? 'This quote was declined by the client.'
                : quote.status === 'sent'
                    ? 'Sent — awaiting client approval.'
                    : undefined,
            actions: (
                <Button variant="outline" size="sm" onClick={handleOpenQuote}>
                    <Pencil className="mr-2 h-4 w-4" /> Open Quote
                </Button>
            ),
        },
        {
            key: 'work-order',
            title: 'Work Order',
            icon: Wrench,
            outcome: outcomes[2],
            rows: workOrder ? [
                { label: 'Work order #', value: workOrder.workOrderNumber },
                { label: 'Status', value: workOrder.status.replace(/_/g, ' ') },
                { label: 'Scheduled', value: fmtDate(workOrder.scheduledDate) },
                { label: 'Assigned to', value: workOrder.assignedWorkerName || '—' },
            ] : [],
            note: !declined && !workOrder && invoice
                ? 'Skipped — this quote was invoiced directly without a work order.'
                : !declined && !workOrder && !invoice
                    ? 'No work order yet — convert the approved quote to start the job.'
                    : undefined,
            actions: workOrder ? (
                <Button variant="outline" size="sm" asChild>
                    <Link href={`/accounting/work-orders/${workOrder.id}`}>Open Work Order</Link>
                </Button>
            ) : undefined,
        },
        {
            key: 'completion',
            title: 'Completion',
            icon: CheckCheck,
            outcome: outcomes[3],
            rows: workOrder ? [
                { label: 'Status', value: workOrder.status.replace(/_/g, ' ') },
                { label: 'Completed', value: workOrder.completedDate ? fmtDate(workOrder.completedDate) : 'Not yet' },
            ] : [],
            note: !declined && workOrder && outcomes[3] === 'incomplete'
                ? 'The work order has not been marked completed yet.'
                : !declined && !workOrder && invoice
                    ? 'Skipped — no work order was used for this job.'
                    : undefined,
        },
        {
            key: 'invoice',
            title: 'Invoice',
            icon: Receipt,
            outcome: outcomes[4],
            rows: invoice ? [
                { label: 'Invoice #', value: invoice.invoiceNumber },
                { label: 'Issued', value: fmtDate(invoice.invoiceDate) },
                { label: 'Due', value: fmtDate(invoice.dueDate) },
                { label: 'Total', value: formatCurrency(invoice.originalAmount) },
                { label: 'Paid to date', value: formatCurrency(invoice.amountPaid) },
                { label: 'Balance', value: formatCurrency(balance) },
            ] : [],
            note: !declined && !invoice
                ? (quote.status === 'invoiced' || quote.status === 'paid'
                    ? 'An invoice exists for this quote, but it predates the tracking links (legacy data) and could not be matched automatically.'
                    : 'No invoice has been created for this job yet.')
                : undefined,
            actions: invoice ? (
                <>
                    <Button variant="outline" size="sm" onClick={() => router.push(`/accounting/invoicing-report?highlight=${invoice.id}`)}>
                        Open in Invoicing Report
                    </Button>
                    {payments.length > 0 && (
                        <Button variant="outline" size="sm" onClick={() => openInvoiceReceipt(invoice, (href) => router.push(href))}>
                            View Latest Receipt
                        </Button>
                    )}
                </>
            ) : undefined,
        },
        {
            key: 'receipt',
            title: 'Receipt / Payment',
            icon: DollarSign,
            outcome: outcomes[5],
            rows: [],
            note: !invoice
                ? undefined
                : paidInFull
                    ? `Paid in full${payments.length ? ` — ${payments.length} payment${payments.length === 1 ? '' : 's'} recorded.` : '.'}`
                    : payments.length === 0
                        ? 'No payments recorded yet.'
                        : `Partially paid — balance owing ${formatCurrency(balance)}.`,
            content: payments.length > 0 ? (
                <div className="mt-3 overflow-hidden rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Receipt #</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payments.map((p: any) => (
                                <TableRow key={p.id}>
                                    <TableCell className="font-medium">{p.receiptNumber || '—'}</TableCell>
                                    <TableCell>{fmtDate(p.date)}</TableCell>
                                    <TableCell>{p.paymentMethod || '—'}</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(p.totalAmount)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : undefined,
        },
    ] : [];

    const journeyDone = firstIncomplete === -1;

    return (
        <div className="p-4 sm:p-6 space-y-6 text-black bg-background min-h-screen max-w-4xl mx-auto">
            <InvoicePageHeader pageTitle="Quote Tracking" hubPath="/accounting/quotes" hubLabel="Quote Manager" />
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <Button variant="outline" className="shrink-0" onClick={() => router.push('/accounting/quotes')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Quote Manager
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold font-headline text-primary">From Quote to Receipt Tracking</h1>
                        <p className="text-sm text-muted-foreground">
                            {quote
                                ? `${quote.quoteNumber} — ${quote.companyName}`
                                : 'Follow a job through every stage: request, quote, work order, invoice and payment.'}
                        </p>
                    </div>
                </div>
                {quote && (
                    <Badge variant="outline" className="capitalize text-sm">
                        {quote.status.replace(/_/g, ' ')}
                    </Badge>
                )}
            </header>

            {isLoading || isAuthLoading ? (
                <div className="flex justify-center py-24">
                    <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : !quote ? (
                <Card className="shadow-sm border-primary/10">
                    <CardContent className="py-12 text-center">
                        <p className="font-semibold">Quote not found</p>
                        <p className="mt-1 text-sm text-muted-foreground">It may have been deleted, or the link is stale.</p>
                        <Button variant="outline" className="mt-4" onClick={() => router.push('/accounting/quotes')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Quotes
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <Card className="shadow-sm border-primary/10">
                        <CardHeader className="bg-primary/5 border-b">
                            <CardTitle className="text-base">Job Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div>
                                <p className="text-muted-foreground">Client</p>
                                <p className="font-semibold">{quote.companyName}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Quote amount</p>
                                <p className="font-semibold font-mono">{formatCurrency(quote.totalAmount)}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Current stage</p>
                                <p className="font-semibold">
                                    {declined
                                        ? 'Declined'
                                        : journeyDone
                                            ? 'Complete — fully paid'
                                            : firstIncomplete >= 0
                                                ? stages[firstIncomplete].title
                                                : '—'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {declined && (
                        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
                            <XCircle className="h-4 w-4 shrink-0" /> This quote was declined — the remaining stages do not apply.
                        </div>
                    )}
                    {!declined && journeyDone && (
                        <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-800">
                            <CheckCircle className="h-4 w-4 shrink-0" /> Completed end to end — this job has been paid in full.
                        </div>
                    )}
                    {legacyMatch && (
                        <p className="text-xs text-muted-foreground">
                            Note: the invoice link was matched from legacy conversion text. Run{' '}
                            <code className="rounded bg-muted px-1 py-0.5">npx tsx scratch/backfill-invoice-source-refs.ts --commit</code>{' '}
                            to stamp it permanently.
                        </p>
                    )}

                    <div className="space-y-4">
                        {stages.map((stage, index) => {
                            const state = toState(stage.outcome, index);
                            const cfg = stateConfig[state];
                            const StageIcon = stage.icon;
                            const StateIcon = cfg.icon;
                            return (
                                <Card key={stage.key} className={cn('shadow-sm border-primary/10', state === 'na' && 'opacity-60')}>
                                    <CardContent className="pt-6">
                                        <div className="flex items-start gap-4">
                                            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', cfg.iconWrapClass)}>
                                                <StageIcon className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-xs font-medium text-muted-foreground">Stage {index + 1} of {stages.length}</span>
                                                        <h2 className="text-base font-semibold">{stage.title}</h2>
                                                    </div>
                                                    <Badge variant="outline" className={cn('capitalize', cfg.badgeClass)}>
                                                        <StateIcon className="mr-1 h-3 w-3" /> {cfg.label}
                                                    </Badge>
                                                </div>
                                                {stage.rows.length > 0 && (
                                                    <dl className="mt-2 grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
                                                        {stage.rows.map(row => (
                                                            <div key={row.label} className="flex items-baseline justify-between gap-4 text-sm">
                                                                <dt className="text-muted-foreground">{row.label}</dt>
                                                                <dd className="text-right font-medium">{row.value}</dd>
                                                            </div>
                                                        ))}
                                                    </dl>
                                                )}
                                                {stage.note && <p className="mt-2 text-sm text-muted-foreground">{stage.note}</p>}
                                                {stage.content}
                                                {stage.actions && (
                                                    <div className="mt-3 flex flex-wrap gap-2">{stage.actions}</div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}






