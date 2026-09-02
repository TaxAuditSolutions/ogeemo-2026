'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { getExpenseCategories, getCompanies } from '@/core/accounting-service';
import { useAuth } from '@/context/auth-context';
import { AccountingPageHeader } from '@/components/accounting/page-header';
import { getFolders as getDocumentFolders, findOrCreateFileFolder, updateFolder, type FolderItem } from '@/core/file-manager-folders';
import { FileText, Sparkles, BadgeCheck, PlusCircle, UploadCloud, ArrowRight, LoaderCircle, Info } from 'lucide-react';
import {
  addReceiptQueueItem,
  getReceiptQueueItems,
  postReceiptToLedger,
  seedSampleReceiptQueueItem,
  syncReceiptQueueFromDrive,
  type ReceiptStagingItem,
  updateReceiptQueueItem,
} from '@/services/receipt-staging-service';

export function ReceiptProcessorView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = React.useState<ReceiptStagingItem[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [posting, setPosting] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [categoryOptions, setCategoryOptions] = React.useState<string[]>([]);
  const [folderOptions, setFolderOptions] = React.useState<FolderItem[]>([]);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const selected = React.useMemo(
    () => items.find((item) => item.id === selectedId) ?? items[0] ?? null,
    [items, selectedId]
  );

  const ensureDefaultReceiptFolder = React.useCallback(async () => {
    if (!user) return null;

    const folders = await getDocumentFolders(user.uid);
    let receiptFolder = folders.find((folder) => folder.name.toLowerCase() === 'receipts');

    if (!receiptFolder) {
      receiptFolder = await findOrCreateFileFolder(user.uid, 'Receipts');
    }

    if (!receiptFolder.driveLink || !receiptFolder.driveLink.trim()) {
      const defaultDriveLink = 'https://drive.google.com/drive/u/0/my-drive';
      await updateFolder(receiptFolder.id, { driveLink: defaultDriveLink });
      receiptFolder = { ...receiptFolder, driveLink: defaultDriveLink };
    }

    return receiptFolder;
  }, [user]);

  const loadData = React.useCallback(async () => {
    if (!user) {
      setItems([]);
      setErrorMessage('Please sign in to access the receipt intake queue.');
      setLoading(false);
      return;
    }

    try {
      setErrorMessage(null);
      const queue = await getReceiptQueueItems();
      setItems(queue);
      if (!selectedId && queue[0]) {
        setSelectedId(queue[0].id);
      }

      const categories = await getExpenseCategories(user.uid);
      const deduped = Array.from(new Set(categories.map((cat) => cat.name).filter(Boolean))) as string[];
      setCategoryOptions(deduped);

      const defaultReceiptFolder = await ensureDefaultReceiptFolder();
      const folders = await getDocumentFolders(user.uid);
      const linkedFolders = folders.filter((folder) => Boolean(folder.driveLink && folder.driveLink.trim()));
      setFolderOptions(linkedFolders.length > 0 ? linkedFolders : defaultReceiptFolder ? [defaultReceiptFolder] : []);

      if (selected && !selected.driveFolderPath && defaultReceiptFolder?.driveLink) {
        await updateReceiptQueueItem(selected.id, { driveFolderPath: defaultReceiptFolder.driveLink });
        setItems((current) => current.map((item) => item.id === selected.id ? { ...item, driveFolderPath: defaultReceiptFolder.driveLink } : item));
      }
    } catch (error: any) {
      console.error('Failed to load receipt queue', error);
      const nextMessage = error?.message?.includes('organization membership')
        ? 'Receipt intake requires an active company workspace membership and access to accounting data.'
        : 'Unable to load the receipt intake queue. Please verify your workspace access and try again.';
      setErrorMessage(nextMessage);
      setItems([]);
      toast({ variant: 'destructive', title: 'Load Error', description: nextMessage });
    } finally {
      setLoading(false);
    }
  }, [ensureDefaultReceiptFolder, selected, selectedId, toast, user]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const updateSelected = React.useCallback(async (partial: Partial<ReceiptStagingItem>) => {
    if (!selected) return;
    setSaving(true);
    try {
      await updateReceiptQueueItem(selected.id, partial);
      setItems((current) => current.map((item) => item.id === selected.id ? { ...item, ...partial } : item));
    } catch (error) {
      console.error('Failed to update queue item', error);
      toast({ variant: 'destructive', title: 'Update failed', description: 'Could not save the review changes.' });
    } finally {
      setSaving(false);
    }
  }, [selected, toast]);

  const handlePost = React.useCallback(async () => {
    if (!selected) return;
    setPosting(true);
    try {
      await postReceiptToLedger(selected.id, {
        merchantName: selected.merchantName,
        transactionDate: selected.transactionDate,
        netAmount: selected.netAmount,
        totalAmount: selected.totalAmount,
        taxAmount: selected.taxAmount,
        proposedCompany: selected.proposedCompany,
        proposedCategory: selected.proposedCategory,
        proposedDescription: selected.proposedDescription,
        businessReason: selected.businessReason,
        auditReferenceId: selected.auditReferenceId,
        documentUrl: selected.documentUrl,
        proposedLedgerType: selected.proposedLedgerType ?? 'expense',
      });
      toast({ title: 'Receipt posted', description: 'The ledger entry was created and the receipt was marked as processed.' });
      await loadData();
    } catch (error) {
      console.error('Failed to post receipt', error);
      toast({ variant: 'destructive', title: 'Post failed', description: 'Receipt could not be posted to the ledger.' });
    } finally {
      setPosting(false);
    }
  }, [loadData, selected, toast]);

  const handleSeedDemo = React.useCallback(async () => {
    try {
      const created = await seedSampleReceiptQueueItem();
      setItems((current) => [created, ...current]);
      setSelectedId(created.id);
      toast({ title: 'Demo item added', description: 'A sample receipt is ready for review.' });
    } catch (error) {
      console.error('Failed to seed demo receipt', error);
      toast({ variant: 'destructive', title: 'Seed failed', description: 'Could not create the sample receipt item.' });
    }
  }, [toast]);

  const handleSyncDrive = React.useCallback(async () => {
    setSyncing(true);
    try {
      const synced = await syncReceiptQueueFromDrive();
      if (synced.length === 0) {
        toast({ title: 'Drive sync complete', description: 'No new files were found in the unprocessed receipts folder.' });
        return;
      }

      setItems((current) => [...synced, ...current]);
      setSelectedId(synced[0].id);
      toast({ title: 'Drive sync complete', description: `${synced.length} new receipt item(s) were added to the queue.` });
    } catch (error: any) {
      console.error('Failed to sync Drive receipts', error);
      toast({ variant: 'destructive', title: 'Drive sync failed', description: error.message || 'Unable to sync Google Drive receipts.' });
    } finally {
      setSyncing(false);
    }
  }, [toast]);

  const handleOpenSourceFile = React.useCallback(() => {
    if (!selected) return;

    if (selected.documentUrl) {
      window.open(selected.documentUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (selected.driveFileId) {
      window.open(`https://drive.google.com/file/d/${selected.driveFileId}/view`, '_blank', 'noopener,noreferrer');
      return;
    }

    fileInputRef.current?.click();
  }, [selected]);

  const handleOpenDriveFolder = React.useCallback(() => {
    if (!selected) return;
    const folderUrl = selected.driveFolderPath?.trim() || 'https://drive.google.com/drive/u/0/my-drive';
    window.open(folderUrl, '_blank', 'noopener,noreferrer');
  }, [selected]);

  const handleSelectSourceFile = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selected) {
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    updateSelected({
      documentUrl: objectUrl,
      driveFileName: file.name,
      sourceType: 'uploaded_pdf',
      status: 'queued',
    });

    if (event.target) {
      event.target.value = '';
    }
  }, [selected, updateSelected]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Loading receipt queue...
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <AccountingPageHeader pageTitle="Receipt Processor" hubPath="/accounting" hubLabel="Accounting Hub" />
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Receipt intake unavailable</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This page needs a valid company workspace account with access to the accounting module.
            </p>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => loadData()} variant="outline">Retry</Button>
              <Button asChild>
                <Link href="/accounting">Back to accounting</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <AccountingPageHeader pageTitle="Receipt Processor" hubPath="/accounting" hubLabel="Accounting Hub" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Audit-ready intake</p>
            <h1 className="text-2xl font-bold">Receipt review queue</h1>
          </div>
          <Button asChild variant="ghost" size="icon" aria-label="How the receipt intake process works">
            <Link href="/accounting/receipt-processor/instructions">
              <Info className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSyncDrive} variant="outline" disabled={syncing}>
            {syncing ? 'Syncing...' : 'Sync Drive receipts'}
          </Button>
          <Button onClick={handleSeedDemo} variant="outline">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add demo item
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <Card>
          <CardHeader>
            <CardTitle>Queued receipts</CardTitle>
            <CardDescription>Review source documents before posting to the BKS ledger.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No items are waiting for review.
              </div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`w-full rounded-lg border p-3 text-left transition ${selected?.id === item.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
                  onClick={() => setSelectedId(item.id)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{item.merchantName || item.proposedCompany || 'Unspecified merchant'}</div>
                      <div className="text-xs text-muted-foreground">{item.transactionDate || 'No date'}</div>
                    </div>
                    <Badge variant={item.status === 'posted' ? 'default' : 'secondary'}>{item.status}</Badge>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">{item.totalAmount ? `$${item.totalAmount.toFixed(2)}` : 'No total'} • {item.proposedCategory || 'Uncategorized'}</div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {selected ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>{selected.merchantName || 'Receipt review'}</CardTitle>
                  <CardDescription>Review OCR extraction and post to the ledger.</CardDescription>
                </div>
                <Badge variant="outline">{selected.auditReferenceId || 'Pending ref'}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-[1.1fr_1.2fr]">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium">Source document</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      {selected.driveFileName || 'Receipt preview'}
                    </div>
                  </div>

                  <div className="flex min-h-[260px] items-center justify-center rounded-md border border-dashed bg-background text-center p-6">
                    {selected.documentUrl ? (
                      <div className="space-y-3">
                        <UploadCloud className="mx-auto h-10 w-10 text-primary" />
                        <p className="font-medium">Document available</p>
                        <Button variant="link" className="h-auto p-0 text-sm text-primary" onClick={handleOpenSourceFile}>
                          Open source file
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Sparkles className="mx-auto h-10 w-10 text-primary" />
                        <p className="font-medium">OCR pass is ready</p>
                        <p className="text-sm text-muted-foreground">No source file was attached yet. Use Google Drive or upload a receipt to attach the source document.</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="space-y-2">
                      <Label>Source folder</Label>
                      <Input
                        value={selected.driveFolderPath ?? ''}
                        onChange={(e) => updateSelected({ driveFolderPath: e.target.value })}
                        placeholder="https://drive.google.com/drive/folders/..."
                      />
                      {folderOptions.length > 0 ? (
                        <Select
                          value={selected.driveFolderPath ?? ''}
                          onValueChange={(value) => updateSelected({ driveFolderPath: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a linked Drive folder" />
                          </SelectTrigger>
                          <SelectContent>
                            {folderOptions.map((folder) => (
                              <SelectItem key={folder.id} value={folder.driveLink ?? ''}>{folder.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={handleOpenDriveFolder}>
                        Open Google Drive folder
                      </Button>
                      <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                        Upload receipt
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf,image/*"
                        className="hidden"
                        onChange={handleSelectSourceFile}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Merchant</Label>
                      <Input value={selected.merchantName ?? ''} onChange={(e) => updateSelected({ merchantName: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Audit ref</Label>
                      <Input value={selected.auditReferenceId ?? ''} onChange={(e) => updateSelected({ auditReferenceId: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Transaction date</Label>
                      <Input type="date" value={selected.transactionDate ?? ''} onChange={(e) => updateSelected({ transactionDate: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Ledger type</Label>
                      <Select value={selected.proposedLedgerType ?? 'expense'} onValueChange={(value) => updateSelected({ proposedLedgerType: value as any })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select ledger type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="expense">Expense</SelectItem>
                          <SelectItem value="payable_bill">Payable bill</SelectItem>
                          <SelectItem value="income">Income</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Net amount</Label>
                      <Input type="number" step="0.01" value={selected.netAmount ?? 0} onChange={(e) => updateSelected({ netAmount: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Tax amount</Label>
                      <Input type="number" step="0.01" value={selected.taxAmount ?? 0} onChange={(e) => updateSelected({ taxAmount: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Total amount</Label>
                      <Input type="number" step="0.01" value={selected.totalAmount ?? 0} onChange={(e) => updateSelected({ totalAmount: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Vendor / company</Label>
                      <Input value={selected.proposedCompany ?? selected.merchantName ?? ''} onChange={(e) => updateSelected({ proposedCompany: e.target.value })} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Category</Label>
                      <Select value={selected.proposedCategory ?? ''} onValueChange={(value) => updateSelected({ proposedCategory: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categoryOptions.map((category) => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Business reason</Label>
                    <Textarea value={selected.businessReason ?? ''} onChange={(e) => updateSelected({ businessReason: e.target.value })} rows={3} />
                  </div>

                  <div className="space-y-2">
                    <Label>Purpose / description</Label>
                    <Textarea value={selected.proposedDescription ?? ''} onChange={(e) => updateSelected({ proposedDescription: e.target.value })} rows={3} />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BadgeCheck className="h-4 w-4 text-primary" />
                  OCR confidence: {selected.confidenceScore ? `${(selected.confidenceScore * 100).toFixed(0)}%` : 'Pending'}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => updateSelected({ status: 'reviewed' })} disabled={saving}>
                    {saving ? 'Saving...' : 'Save review'}
                  </Button>
                  <Button onClick={handlePost} disabled={posting || !selected.businessReason}>
                    {posting ? 'Posting...' : 'Post to ledger'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
