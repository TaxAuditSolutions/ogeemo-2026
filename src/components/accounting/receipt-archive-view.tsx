'use client';

import * as React from 'react';
import Link from 'next/link';
import { Archive, Download, LoaderCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AccountingPageHeader } from '@/components/accounting/page-header';
import { ReceiptArchiveTable } from '@/components/accounting/receipt-archive-table';
import { ReceiptViewerDialog } from '@/components/accounting/receipt-viewer-dialog';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { filterArchive, type ArchiveStatusFilter } from '@/lib/receipt-archive-utils';
import { buildPaperFilingCsv } from '@/lib/receipt-record-keeping';
import { getAllReceiptsForArchive, type ReceiptStagingItem } from '@/services/receipt-staging-service';

const STATUS_OPTIONS: { value: ArchiveStatusFilter; label: string }[] = [
  { value: 'all', label: 'All receipts' },
  { value: 'posted', label: 'Posted to the ledger' },
  { value: 'open', label: 'Still in the queue' },
  { value: 'removed', label: 'Removed from the queue' },
];

/** Permanent record of every receipt, including those already posted to the ledger. */
export function ReceiptArchiveView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [receipts, setReceipts] = React.useState<ReceiptStagingItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState<ArchiveStatusFilter>('all');
  const [viewing, setViewing] = React.useState<ReceiptStagingItem | null>(null);

  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getAllReceiptsForArchive()
      .then((items) => {
        if (!cancelled) setReceipts(items);
      })
      .catch((error: any) => {
        console.error('Failed to load the receipt archive', error);
        toast({ variant: 'destructive', title: 'Could not load receipts', description: error?.message || 'Please try again.' });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, toast]);

  const visible = React.useMemo(() => filterArchive(receipts, search, status), [receipts, search, status]);

  // A list sorted by document number, with where each paper receipt is filed, for pulling originals.
  const exportFilingList = React.useCallback(() => {
    const csv = buildPaperFilingCsv(visible);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipt-filing-list-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [visible]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <AccountingPageHeader pageTitle="Receipt Archive" hubPath="/accounting" hubLabel="Accounting Hub" />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Archive className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Receipt Archive</CardTitle>
                <CardDescription>
                  Every scanned receipt with its permanent stored copy. Click an Ogeemo document number to view the receipt.
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={exportFilingList} disabled={visible.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Paper filing list (CSV)
              </Button>
              <Button asChild variant="outline">
                <Link href="/accounting/receipt-processor">Back to Receipt Processor</Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by number, vendor, file, category, date or amount"
                className="pl-9"
                aria-label="Search receipts"
              />
            </div>
            <Select value={status} onValueChange={(value) => setStatus(value as ArchiveStatusFilter)}>
              <SelectTrigger className="w-[220px]" aria-label="Filter by status"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex h-40 items-center justify-center gap-2 text-muted-foreground">
              <LoaderCircle className="h-5 w-5 animate-spin" /> Loading receipts...
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              {receipts.length === 0 ? 'No receipts have been added yet.' : 'No receipts match your search.'}
            </div>
          ) : (
            <ReceiptArchiveTable receipts={visible} onView={setViewing} />
          )}
        </CardContent>
      </Card>

      <ReceiptViewerDialog
        receiptId={viewing?.id ?? null}
        documentNumber={viewing?.auditReferenceId}
        onClose={() => setViewing(null)}
      />
    </div>
  );
}
