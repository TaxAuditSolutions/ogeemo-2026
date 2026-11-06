'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { addExpenseCategory, getExpenseCategories, getCompanies } from '@/core/accounting-service';
import { useAuth } from '@/context/auth-context';
import { AccountingPageHeader } from '@/components/accounting/page-header';
import { FileText, Sparkles, UploadCloud, ArrowLeft, LoaderCircle, Info, Trash2, AlertTriangle, ScanText, Plus } from 'lucide-react';
import { detectReceiptMime, RECEIPT_MIME_TYPES_CSV, sha256Hex, validateReceiptFileSize } from '@/lib/receipt-file-utils';
import type { ExtractionResult } from '@/lib/receipt-ocr';
import { dedupeById, getOcrEligibleItems, isReceiptEligibleForOcr, mergeQueueItems } from '@/lib/receipt-queue-utils';
import { DEFAULT_RECEIPT_OCR_SETTINGS, maxReceiptFileBytes, type ReceiptOcrSettings } from '@/lib/receipt-ocr-settings';
import { blockingFlags, findPossibleDuplicates, reviewReceipt, type ReceiptFlag } from '@/lib/receipt-review-checks';
import { fetchWithSession } from '@/lib/server-session';
import { isTaxCalculated, taxFieldsForChoice, taxFieldsForTotal } from '@/lib/receipt-tax';
import { RECEIPT_TAX_MANUAL } from '@/lib/receipt-ocr-options';
import { postingBlockReason, resolveRecordKeeping } from '@/lib/receipt-record-keeping';
import { receiptFileUrl } from '@/lib/receipt-storage-utils';
import { resolveOrgId } from '@/services/branding-service';
import { loadReceiptOcrSettingsForOrg } from '@/services/receipt-ocr-settings-service';
import { ReceiptPreview } from './receipt-viewer-dialog';
import {
  deleteReceiptQueueItem,
  fetchStoredReceiptFile,
  getReceiptQueueItems,
  importLocalReceiptToQueue,
  postReceiptToLedger,
  type ReceiptStagingItem,
  saveReceiptOcrResult,
  storeReceiptFile,
  updateReceiptQueueItem,
} from '@/services/receipt-staging-service';

export function ReceiptProcessorView() {
  const { user } = useAuth();
  const [addingLocalFile, setAddingLocalFile] = React.useState(false);
  // Bytes remain available in this browser session for previews and explicit OCR runs.
  const [localPreviews, setLocalPreviews] = React.useState<Record<string, { url: string; mimeType: string; bytes: Uint8Array }>>({});
  const { toast } = useToast();
  const [items, setItems] = React.useState<ReceiptStagingItem[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [selectedForOcrIds, setSelectedForOcrIds] = React.useState<string[]>([]);
  const [ocrProcessingIds, setOcrProcessingIds] = React.useState<string[]>([]);
  const [ocrProgress, setOcrProgress] = React.useState<{ current: number; total: number } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [posting, setPosting] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [categoryOptions, setCategoryOptions] = React.useState<string[]>([]);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = React.useState(false);
  const [newCategoryName, setNewCategoryName] = React.useState('');
  const [addingCategory, setAddingCategory] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [ocrSettings, setOcrSettings] = React.useState<ReceiptOcrSettings>(DEFAULT_RECEIPT_OCR_SETTINGS);
  // Set after Open File when the workspace runs OCR automatically on upload.
  const [autoOcrIds, setAutoOcrIds] = React.useState<string[]>([]);
  // Progress while several files are being added: how many are finished out of the total.
  const [addProgress, setAddProgress] = React.useState<{ done: number; total: number } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const selected = React.useMemo(
    () => items.find((item) => item.id === selectedId) ?? items[0] ?? null,
    [items, selectedId]
  );
  const ocrEligibleItems = React.useMemo(() => getOcrEligibleItems(items), [items]);

  // Review checks use the workspace's OCR rules (Settings > Receipt OCR Rules).
  const duplicateMap = React.useMemo(
    () => (ocrSettings.duplicateMode === 'file_and_fields' ? findPossibleDuplicates(items) : new Map<string, string[]>()),
    [items, ocrSettings.duplicateMode]
  );
  const flagsById = React.useMemo(() => {
    const map = new Map<string, ReceiptFlag[]>();
    for (const item of items) {
      map.set(item.id, reviewReceipt(ocrSettings, item, { duplicateOfIds: duplicateMap.get(item.id) }));
    }
    return map;
  }, [items, ocrSettings, duplicateMap]);
  const selectedFlags = selected ? flagsById.get(selected.id) ?? [] : [];
  const selectedErrors = blockingFlags(selectedFlags);
  // What is enforced depends on the record-keeping mode (Settings > Receipt OCR Rules).
  const controls = React.useMemo(() => resolveRecordKeeping(ocrSettings), [ocrSettings]);
  const postingBlockedReason = !selected
    ? ''
    : postingBlockReason(controls, selected, selectedErrors.map((flag) => flag.message));
  const postingAllowed = !!selected && !postingBlockedReason;
  const ocrRunning = ocrProcessingIds.length > 0;
  const allEligibleSelected = ocrEligibleItems.length > 0
    && ocrEligibleItems.every((item) => selectedForOcrIds.includes(item.id));
  const someEligibleSelected = ocrEligibleItems.some((item) => selectedForOcrIds.includes(item.id));

  const loadData = React.useCallback(async () => {
    if (!user) {
      setItems([]);
      setErrorMessage('Please sign in to access the receipt intake queue.');
      setLoading(false);
      return;
    }

    try {
      setErrorMessage(null);
      const queue = dedupeById(await getReceiptQueueItems());
      setItems(queue);
      setSelectedId((current) => current && queue.some((item) => item.id === current) ? current : queue[0]?.id ?? null);
      setSelectedForOcrIds((current) => current.filter((id) => {
        const item = queue.find((candidate) => candidate.id === id);
        return item ? isReceiptEligibleForOcr(item) : false;
      }));

      const categories = await getExpenseCategories(user.uid);
      const deduped = Array.from(new Set(categories.map((cat) => cat.name).filter(Boolean))) as string[];
      setCategoryOptions(deduped);
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
  }, [toast, user]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    resolveOrgId()
      .then((orgId) => (orgId ? loadReceiptOcrSettingsForOrg(orgId) : null))
      .then((settings) => {
        if (!cancelled && settings) setOcrSettings(settings);
      })
      .catch(() => {
        /* keep the defaults when the rules cannot be read */
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

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

  const handleAddCategory = React.useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !selected || addingCategory) return;

    const name = newCategoryName.trim();
    if (!name) {
      toast({ variant: 'destructive', title: 'Category name required', description: 'Enter a name for the new category.' });
      return;
    }

    setAddingCategory(true);
    try {
      const existing = categoryOptions.find((category) => category.toLocaleLowerCase() === name.toLocaleLowerCase());
      const categoryName = existing ?? (await addExpenseCategory({ name, userId: user.uid })).name;
      if (!existing) {
        setCategoryOptions((current) => Array.from(new Set([...current, categoryName])).sort((a, b) => a.localeCompare(b)));
      }

      await updateSelected({ proposedCategory: categoryName });
      setIsAddCategoryOpen(false);
      setNewCategoryName('');
      toast({
        title: existing ? 'Category selected' : 'Category added',
        description: existing
          ? `${categoryName} was already available and has been selected.`
          : `${categoryName} was added to the dropdown and selected for this receipt.`,
      });
    } catch (error: any) {
      console.error('Failed to add expense category', error);
      toast({ variant: 'destructive', title: 'Could not add category', description: error?.message || 'Unable to save the new category.' });
    } finally {
      setAddingCategory(false);
    }
  }, [addingCategory, categoryOptions, newCategoryName, selected, toast, updateSelected, user]);

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
        taxType: selected.taxType,
        taxRate: selected.taxRate,
        proposedCompany: selected.proposedCompany,
        proposedCategory: selected.proposedCategory,
        proposedDescription: selected.proposedDescription,
        businessReason: selected.businessReason,
        proposedLedgerType: selected.proposedLedgerType ?? 'expense',
      }, { requireScan: controls.requireScanToPost });
      toast({ title: 'Receipt posted', description: 'The ledger entry was created and the receipt was marked as processed.' });
      await loadData();
    } catch (error: any) {
      console.error('Failed to post receipt', error);
      toast({
        variant: 'destructive',
        title: 'Post failed',
        description: error?.message || 'Receipt could not be posted to the ledger.',
      });
    } finally {
      setPosting(false);
    }
  }, [controls.requireScanToPost, loadData, selected, toast]);

  const handleOpenSourceFile = React.useCallback(() => {
    if (!selected) return;

    const localPreview = localPreviews[selected.id];
    if (localPreview) {
      window.open(localPreview.url, '_blank', 'noopener,noreferrer');
      return;
    }

    if (selected.documentUrl) {
      window.open(selected.documentUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (selected.driveFileId) {
      window.open(`https://drive.google.com/file/d/${selected.driveFileId}/view`, '_blank', 'noopener,noreferrer');
    }
  }, [localPreviews, selected]);

  const rememberLocalPreview = React.useCallback((itemId: string, bytes: Uint8Array, mimeType: string) => {
    const previewUrl = URL.createObjectURL(new Blob([new Uint8Array(bytes).buffer], { type: mimeType }));
    setLocalPreviews((current) => {
      if (current[itemId]) URL.revokeObjectURL(current[itemId].url);
      return { ...current, [itemId]: { url: previewUrl, mimeType, bytes } };
    });
  }, []);

  type AddFileOutcome =
    | { kind: 'added' | 'existing'; fileName: string; item: ReceiptStagingItem; storeError: string }
    | { kind: 'failed'; fileName: string; error: string };

  // Adds one chosen file to the queue and stores its scan. It never throws: the outcome says what happened.
  const addOneFile = React.useCallback(async (file: File): Promise<AddFileOutcome> => {
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const sizeError = validateReceiptFileSize(bytes.byteLength);
      if (sizeError) throw new Error(sizeError);
      if (bytes.byteLength > maxReceiptFileBytes(ocrSettings)) {
        throw new Error(`The file is larger than ${ocrSettings.maxFileSizeMB} MB (set in Settings > Receipt OCR Rules).`);
      }
      const mimeType = detectReceiptMime(bytes);
      if (!mimeType) throw new Error('Choose a PDF, PNG, JPEG, or WebP receipt.');
      const fileHash = await sha256Hex(bytes);
      const result = await importLocalReceiptToQueue(
        { fileName: file.name, mimeType, fileSize: bytes.byteLength, fileHash },
        {
          ledgerType: ocrSettings.defaultLedgerType,
          category: ocrSettings.defaultCategory,
          recordKeepingMode: controls.mode,
        }
      );
      let queuedItem = result.status === 'created' ? result.item : result.existing;

      // Keep a permanent private copy when the record-keeping controls say so. Reopening an
      // existing receipt that was never stored (added earlier, or with scans switched off)
      // stores it now.
      let storeError = '';
      if (controls.keepScan && !queuedItem.storagePath) {
        try {
          const storagePath = await storeReceiptFile(queuedItem.id, bytes);
          queuedItem = { ...queuedItem, storagePath };
        } catch (error: any) {
          storeError = error?.message || 'The file could not be stored.';
        }
      }

      // The preview and OCR bytes stay in this browser session as well.
      rememberLocalPreview(queuedItem.id, bytes, mimeType);
      const added = queuedItem;
      setItems((current) => mergeQueueItems(current, [added]));
      if (isReceiptEligibleForOcr(added)) {
        setSelectedForOcrIds((current) => current.includes(added.id) ? current : [...current, added.id]);
      }
      return { kind: result.status === 'created' ? 'added' : 'existing', fileName: file.name, item: added, storeError };
    } catch (error: any) {
      console.error('Failed to add local receipt', error);
      return { kind: 'failed', fileName: file.name, error: error?.message || 'Unable to add the receipt to the queue.' };
    }
  }, [controls, ocrSettings, rememberLocalPreview]);

  const handleOpenFile = React.useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;

    setAddingLocalFile(true);
    const outcomes: AddFileOutcome[] = [];
    try {
      // One at a time, so document numbers are claimed in order and can never collide.
      for (let index = 0; index < files.length; index += 1) {
        setAddProgress({ done: index, total: files.length });
        outcomes.push(await addOneFile(files[index]));
      }
    } finally {
      setAddProgress(null);
      setAddingLocalFile(false);
    }

    const added = outcomes.filter((outcome): outcome is Extract<AddFileOutcome, { item: ReceiptStagingItem }> => outcome.kind !== 'failed');
    const lastAdded = added[added.length - 1];
    if (lastAdded) setSelectedId(lastAdded.item.id);

    // Run OCR for the new receipts when the workspace rule "run OCR automatically" is on.
    if (ocrSettings.autoRunOcrOnUpload) {
      const autoIds = added
        .filter((outcome) => !outcome.storeError && isReceiptEligibleForOcr(outcome.item))
        .map((outcome) => outcome.item.id);
      if (autoIds.length > 0) setAutoOcrIds(autoIds);
    }

    if (files.length === 1) {
      const outcome = outcomes[0];
      if (outcome.kind === 'failed') {
        toast({ variant: 'destructive', title: 'Could not add file', description: outcome.error });
      } else if (outcome.storeError) {
        toast({
          variant: 'destructive',
          title: 'Added, but the scan was not stored',
          description: controls.requireScanToPost
            ? `${outcome.storeError} The receipt cannot be posted until its scan is stored. Use Open File to try again.`
            : `${outcome.storeError} Its document number will not open a scan in the ledger. Use Open File to try again.`,
        });
      } else {
        toast({
          title: outcome.kind === 'added' ? 'Added to receipts queue' : controls.keepScan ? 'Receipt scan stored' : 'Already in the queue',
          description: outcome.kind === 'added'
            ? `${outcome.fileName} was saved as ${outcome.item.auditReferenceId}${controls.keepScan ? '' : '. Write this number on the paper receipt'} and is ready for OCR.`
            : `${outcome.fileName} matches ${outcome.item.auditReferenceId ?? 'an existing receipt'}.`,
        });
      }
      return;
    }

    const newCount = outcomes.filter((outcome) => outcome.kind === 'added').length;
    const existingCount = outcomes.filter((outcome) => outcome.kind === 'existing').length;
    const failures = outcomes.filter((outcome): outcome is Extract<AddFileOutcome, { kind: 'failed' }> => outcome.kind === 'failed');
    const notStored = added.filter((outcome) => outcome.storeError);
    const parts = [
      `${newCount} added`,
      existingCount > 0 ? `${existingCount} already in the queue` : '',
      failures.length > 0 ? `${failures.length} could not be added` : '',
      notStored.length > 0 ? `${notStored.length} added without a stored scan` : '',
    ].filter(Boolean);
    const problems = [
      ...failures.map((outcome) => `${outcome.fileName}: ${outcome.error}`),
      ...notStored.map((outcome) => `${outcome.fileName}: ${outcome.storeError}`),
    ];
    toast({
      variant: problems.length > 0 ? 'destructive' : undefined,
      title: `${files.length} files processed`,
      description: `${parts.join(', ')}.${problems.length > 0 ? ` ${problems.slice(0, 2).join(' ')}${problems.length > 2 ? ` (and ${problems.length - 2} more)` : ''} Use Open File to retry those.` : ''}`,
    });
  }, [addOneFile, controls, ocrSettings, toast]);

  const runOcrForReceipts = React.useCallback(async (requestedIds: string[]) => {
    if (ocrRunning) return;
    const targetIds = requestedIds.filter((id) => ocrEligibleItems.some((item) => item.id === id));
    if (targetIds.length === 0) return;

    setOcrProcessingIds(targetIds);
    setOcrProgress({ current: 0, total: targetIds.length });
    let completedCount = 0;
    let failedCount = 0;
    let lastError = '';

    // Run sequentially to avoid a burst of billable OCR requests.
    for (const [index, itemId] of targetIds.entries()) {
      const item = items.find((candidate) => candidate.id === itemId);
      if (!item) continue;
      setOcrProgress({ current: index + 1, total: targetIds.length });

      try {
        let extraction: ExtractionResult;
        // Use the copy in this browser session if there is one; otherwise read the permanent
        // stored copy, so the original never has to be chosen again after a refresh.
        let preview: { mimeType: string; bytes: Uint8Array } | undefined = localPreviews[itemId];
        let loadError = '';
        if (!preview && item.storagePath) {
          try {
            preview = await fetchStoredReceiptFile(itemId);
          } catch (error: any) {
            loadError = error?.message || 'The stored receipt could not be loaded.';
          }
        }
        if (preview) {
          const response = await fetchWithSession('/api/receipts/extract', {
            method: 'POST',
            headers: { 'Content-Type': preview.mimeType },
            body: new Uint8Array(preview.bytes).buffer,
          });
          const result = (await response.json().catch(() => ({ error: `OCR request failed (${response.status}).` }))) as ExtractionResult;
          if (response.status === 401) throw new Error('Your session expired. Please sign in again.');
          extraction = response.ok ? result : { error: result.error || `OCR request failed (${response.status}).` };
        } else {
          extraction = {
            error: loadError
              ? `${loadError} Use Open File to choose the original file again, then retry OCR.`
              : 'No stored copy of this receipt exists yet. Use Open File to choose the original file once; it will then be stored and read.',
          };
        }

        const updates = await saveReceiptOcrResult(itemId, extraction, item, ocrSettings);
        setItems((current) => current.map((candidate) => candidate.id === itemId ? { ...candidate, ...updates } : candidate));
        if (extraction.data) completedCount += 1;
        else {
          failedCount += 1;
          lastError = extraction.error ?? 'OCR did not return receipt data.';
        }
      } catch (error: any) {
        failedCount += 1;
        lastError = error?.message || 'OCR failed unexpectedly.';
        console.error(`Failed to run OCR for receipt ${itemId}`, error);
      }
    }

    setSelectedForOcrIds((current) => current.filter((id) => !targetIds.includes(id)));
    setOcrProcessingIds([]);
    setOcrProgress(null);
    toast({
      variant: failedCount > 0 ? 'destructive' : 'default',
      title: 'OCR run finished',
      description: `${completedCount} completed; ${failedCount} failed.${lastError && failedCount > 0 ? ` Last error: ${lastError}` : ''}`,
    });
  }, [items, localPreviews, ocrEligibleItems, ocrRunning, ocrSettings, toast]);

  // Run OCR for a receipt just added, when the workspace rule "run OCR automatically" is on.
  React.useEffect(() => {
    if (autoOcrIds.length === 0) return;
    const ready = autoOcrIds.every((id) => items.some((item) => item.id === id) && (localPreviews[id] || items.find((item) => item.id === id)?.storagePath));
    if (!ready) return;
    setAutoOcrIds([]);
    void runOcrForReceipts(autoOcrIds);
  }, [autoOcrIds, items, localPreviews, runOcrForReceipts]);

  const handleDeleteSelected = React.useCallback(async () => {
    if (!selected) return;
    const label = selected.merchantName || selected.fileName || selected.driveFileName || 'this receipt';
    const confirmed = window.confirm(
      `Delete "${label}" from the review queue?\n\nThis removes it from Ogeemo only; the original file is not deleted.`
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      await deleteReceiptQueueItem(selected.id);
      const remaining = items.filter((item) => item.id !== selected.id);
      setItems(remaining);
      setSelectedId(remaining[0]?.id ?? null);
      setSelectedForOcrIds((current) => current.filter((id) => id !== selected.id));
      setLocalPreviews((current) => {
        const preview = current[selected.id];
        if (!preview) return current;
        URL.revokeObjectURL(preview.url);
        const rest = { ...current };
        delete rest[selected.id];
        return rest;
      });
      toast({ title: 'Receipt deleted', description: 'The receipt was removed from the review queue.' });
    } catch (error: any) {
      console.error('Failed to delete receipt', error);
      toast({ variant: 'destructive', title: 'Delete failed', description: error?.message || 'The receipt could not be removed.' });
    } finally {
      setDeleting(false);
    }
  }, [selected, items, toast]);

  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <AccountingPageHeader pageTitle="Receipt Processor" hubPath="/accounting" hubLabel="Accounting Hub" />
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
              Receipt intake needs a valid company workspace account with access to the accounting module.
            </p>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => loadData()} variant="outline">Retry</Button>
              <Button asChild variant="outline">
                <Link href="/accounting">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Accounting Hub
                </Link>
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
            <p className="text-sm text-muted-foreground">Receipt intake and review workflow</p>
            <h1 className="text-2xl font-bold">Receipt review queue</h1>
          </div>
          <Button asChild variant="ghost" size="icon" aria-label="How receipt intake works">
            <Link href="/learn/guides/receipt-intake">
              <Info className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={addingLocalFile || ocrRunning}
          >
            {addingLocalFile ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            {addingLocalFile
              ? (addProgress && addProgress.total > 1 ? `Adding ${Math.min(addProgress.done + 1, addProgress.total)} of ${addProgress.total}...` : 'Adding to queue...')
              : 'Open File'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={RECEIPT_MIME_TYPES_CSV}
            className="hidden"
            onChange={handleOpenFile}
          />
        </div>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="space-y-3 pt-6">
          <p className="text-sm text-muted-foreground">
            Add receipts, run OCR on the files you choose, and verify the extracted fields against the source document before posting.
          </p>
          <ol className="grid gap-3 sm:grid-cols-3">
            <li className="rounded-lg border bg-background p-3 text-sm">
              <span className="font-semibold">1. Add a receipt</span>
              <p className="mt-1 text-muted-foreground">Click <span className="font-medium text-foreground">Open File</span> and choose one or more PDFs or images (hold Ctrl or Shift to select several). They enter the queue without running OCR.</p>
            </li>
            <li className="rounded-lg border bg-background p-3 text-sm">
              <span className="font-semibold">2. Choose one or all for OCR</span>
              <p className="mt-1 text-muted-foreground">Check one or more receipts and choose <span className="font-medium text-foreground">OCR Selected</span>, or choose <span className="font-medium text-foreground">OCR All</span>.</p>
            </li>
            <li className="rounded-lg border bg-background p-3 text-sm">
              <span className="font-semibold">3. Review the extracted fields</span>
              <p className="mt-1 text-muted-foreground">Verify OCR against the source document, complete the review fields, and save the review before posting.</p>
            </li>
          </ol>
          <Button variant="link" className="h-auto p-0 text-sm" asChild>
            <Link href="/learn/guides/receipt-intake">Read the receipt intake workflow guide</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.6fr]">
        <Card>
          <CardHeader>
            <CardTitle>Receipts queue</CardTitle>
            <CardDescription>Open File adds a receipt without OCR. Check receipts for OCR Selected, or process every eligible receipt with OCR All.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.length > 0 ? (
              <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all-receipts"
                      aria-label="Select all receipts that need OCR"
                      checked={allEligibleSelected ? true : someEligibleSelected ? 'indeterminate' : false}
                      disabled={ocrRunning || ocrEligibleItems.length === 0}
                      onCheckedChange={(checked) => setSelectedForOcrIds(checked === true ? ocrEligibleItems.map((item) => item.id) : [])}
                    />
                    <Label htmlFor="select-all-receipts">Select all</Label>
                    <span className="text-xs text-muted-foreground">{ocrEligibleItems.length} need OCR</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={ocrRunning || selectedForOcrIds.length === 0}
                      onClick={() => runOcrForReceipts(selectedForOcrIds)}
                    >
                      <ScanText className="mr-2 h-4 w-4" />
                      OCR Selected{selectedForOcrIds.length > 0 ? ` (${selectedForOcrIds.length})` : ''}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={ocrRunning || ocrEligibleItems.length === 0}
                      onClick={() => runOcrForReceipts(ocrEligibleItems.map((item) => item.id))}
                    >
                      {ocrRunning ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <ScanText className="mr-2 h-4 w-4" />}
                      OCR All
                    </Button>
                  </div>
                </div>
                {ocrProgress ? (
                  <p className="text-xs text-muted-foreground" role="status">
                    Running OCR {ocrProgress.current} of {ocrProgress.total}. Completed receipts are not run again.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">OCR All processes queued receipts that have not completed OCR.</p>
                )}
              </div>
            ) : null}
            {items.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                <p className="font-medium text-foreground">No receipts are waiting for review.</p>
                <p className="mt-1">
                  Click <span className="font-medium text-foreground">Open File</span> to choose a receipt and add it to this queue.
                </p>
              </div>
            ) : (
              items.map((item) => {
                const eligibleForOcr = isReceiptEligibleForOcr(item);
                const processingOcr = ocrProcessingIds.includes(item.id);
                const receiptName = item.merchantName || item.proposedCompany || item.fileName || item.driveFileName || 'Receipt';
                return (
                  <div
                    key={item.id}
                    className={`w-full rounded-lg border p-3 transition ${selected?.id === item.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        className="mt-1"
                        aria-label={`Select ${receiptName} for OCR`}
                        checked={selectedForOcrIds.includes(item.id)}
                        disabled={!eligibleForOcr || ocrRunning}
                        title={eligibleForOcr ? 'Select for OCR' : 'OCR is complete or this receipt is no longer queued'}
                        onCheckedChange={(checked) => setSelectedForOcrIds((current) => {
                          if (checked === true) return current.includes(item.id) ? current : [...current, item.id];
                          return current.filter((id) => id !== item.id);
                        })}
                      />
                      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setSelectedId(item.id)}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="break-words font-medium">{receiptName}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.transactionDate || (item.ocrStatus ? 'No date — manual entry required' : 'Waiting for OCR')}
                            </div>
                            {item.auditReferenceId ? <div className="mt-1 font-mono text-xs text-muted-foreground">{item.auditReferenceId}</div> : null}
                          </div>
                          <div className="flex shrink-0 flex-wrap justify-end gap-1">
                            {processingOcr ? (
                              <Badge variant="secondary"><LoaderCircle className="mr-1 h-3 w-3 animate-spin" />OCR running</Badge>
                            ) : item.ocrStatus === 'completed' ? (
                              <Badge variant="outline">OCR complete</Badge>
                            ) : item.ocrStatus === 'failed' ? (
                              <Badge variant="destructive">OCR failed</Badge>
                            ) : eligibleForOcr ? (
                              <Badge variant="secondary">Needs OCR</Badge>
                            ) : (
                              <Badge variant="secondary">{item.status}</Badge>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          {item.totalAmount != null ? `$${item.totalAmount.toFixed(2)}` : item.ocrStatus ? 'No total' : 'Waiting for OCR'} • {item.proposedCategory || 'Uncategorized'}
                        </div>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {selected ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>{selected.merchantName || selected.fileName || selected.driveFileName || 'Receipt review'}</CardTitle>
                  <CardDescription>Verify the extracted fields against the source document before posting.</CardDescription>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span className="text-xs text-muted-foreground">Ogeemo document</span>
                  <Badge variant="outline" className="font-mono">{selected.auditReferenceId || 'Pending ref'}</Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={deleting || ocrRunning}
                    onClick={handleDeleteSelected}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    {deleting ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium">Source document</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      {selected.fileName || selected.driveFileName || 'Receipt preview'}
                    </div>
                  </div>

                  {localPreviews[selected.id] ? (
                    <div className="overflow-hidden rounded-md border bg-background">
                      {localPreviews[selected.id].mimeType === 'application/pdf' ? (
                        <iframe
                          src={localPreviews[selected.id].url}
                          title={`Imported receipt ${selected.auditReferenceId || selected.driveFileName || ''}`}
                          className="h-[680px] w-full"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={localPreviews[selected.id].url}
                          alt={`Imported receipt ${selected.auditReferenceId || selected.driveFileName || ''}`}
                          className="max-h-[680px] w-full object-contain"
                        />
                      )}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t p-3 text-xs text-muted-foreground">
                        <span>
                          {selected.storagePath
                            ? 'Original scan, stored permanently in your private workspace storage.'
                            : selected.importedFrom === 'google_drive'
                              ? 'Temporary preview from Google Drive — it is not stored by Ogeemo and disappears on refresh.'
                              : 'Temporary local preview — this receipt has no stored copy yet.'}
                        </span>
                        <Button variant="link" className="h-auto p-0 text-sm text-primary" onClick={handleOpenSourceFile}>
                          Open full-size file
                        </Button>
                      </div>
                    </div>
                  ) : selected.storagePath ? (
                    <div className="overflow-hidden rounded-md border bg-background p-2">
                      <ReceiptPreview
                        key={selected.id}
                        receiptId={selected.id}
                        title={`Receipt ${selected.auditReferenceId || ''}`.trim()}
                        className="h-[680px]"
                      />
                      <p className="px-1 pt-2 text-xs text-muted-foreground">
                        Original scan, stored permanently in your private workspace storage.
                      </p>
                    </div>
                  ) : (
                    <div className="flex min-h-[260px] items-center justify-center rounded-md border border-dashed bg-background p-6 text-center">
                      {selected.documentUrl ? (
                        <div className="space-y-3">
                          <UploadCloud className="mx-auto h-10 w-10 text-primary" />
                          <p className="font-medium">
                            {selected.documentUrl.startsWith('blob:')
                              ? 'Temporary local preview'
                              : selected.importedFrom === 'google_drive' ? 'Imported from Google Drive' : 'Source document link'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {selected.documentUrl.startsWith('blob:')
                              ? 'This file has not been durably uploaded and the preview will not survive a refresh.'
                              : selected.importedFrom === 'google_drive'
                                ? 'The file stays in your Google Drive. Ogeemo kept only its details and the OCR fields, so open it in Drive to compare.'
                                : 'Open the source document in a new tab to verify the extracted fields.'}
                          </p>
                          <Button variant="link" className="h-auto p-0 text-sm text-primary" onClick={handleOpenSourceFile}>
                            {selected.documentUrl.startsWith('blob:')
                              ? 'Open temporary preview'
                              : selected.importedFrom === 'google_drive' ? 'Open in Google Drive' : 'Open source document'}
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <Sparkles className="mx-auto h-10 w-10 text-primary" />
                          <p className="font-medium">
                            {selected.importedFrom === 'local_file' ? 'Reopen the source file to continue' : 'No source document attached'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {selected.importedFrom === 'local_file'
                              ? 'Use Open File to choose the original file again. Its content will be matched to this queue item without creating a duplicate.'
                              : 'The extracted fields cannot be verified until a source document is available.'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                </div>

                <div className="space-y-4">
                  {selected.ocrStatus === 'completed' ? (
                    <div className="flex gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <p><span className="font-medium">OCR completed.</span> These fields were extracted from the document by OCR. Verify them against the document; OCR extraction is not approval.</p>
                    </div>
                  ) : selected.ocrStatus === 'failed' ? (
                    <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm" role="alert">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                      <p><span className="font-medium">OCR failed — manual entry required.</span> {selected.ocrError || 'No extraction values were substituted.'}</p>
                    </div>
                  ) : isReceiptEligibleForOcr(selected) ? (
                    <div className="flex gap-2 rounded-md border bg-muted/30 p-3 text-sm">
                      <ScanText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <p><span className="font-medium">Ready for OCR.</span> Use the button below to read this receipt, or check receipts in the queue and choose OCR Selected or OCR All.</p>
                    </div>
                  ) : null}

                  {isReceiptEligibleForOcr(selected) ? (
                    <Button
                      className="w-full"
                      onClick={() => runOcrForReceipts([selected.id])}
                      disabled={ocrRunning}
                    >
                      {ocrProcessingIds.includes(selected.id)
                        ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        : <ScanText className="mr-2 h-4 w-4" />}
                      {ocrProcessingIds.includes(selected.id)
                        ? 'Reading receipt...'
                        : selected.ocrStatus === 'failed' ? 'Retry OCR on this receipt' : 'Run OCR on this receipt'}
                    </Button>
                  ) : null}

                  {selectedFlags.length > 0 ? (
                    <div className="space-y-1.5 rounded-md border p-3 text-sm" role="status" aria-label="Review checks">
                      <p className="font-medium">
                        {selectedErrors.length > 0
                          ? `${selectedErrors.length} ${selectedErrors.length === 1 ? 'problem needs' : 'problems need'} fixing before posting`
                          : 'Please check before posting'}
                      </p>
                      <ul className="space-y-1">
                        {selectedFlags.map((flag) => (
                          <li key={flag.code} className="flex gap-2">
                            <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${flag.severity === 'error' ? 'text-destructive' : 'text-amber-600'}`} />
                            <span>{flag.message}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {!selected.storagePath && controls.keepScan ? (
                    <div className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm" role="alert">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      <p>
                        <span className="font-medium">The scan is not stored yet.</span> Use Open File to choose the original again so a
                        permanent copy is kept and this receipt&apos;s ledger document number can open it.
                        {controls.requireScanToPost ? ' A receipt cannot be posted without it.' : ''}
                      </p>
                    </div>
                  ) : null}

                  {!selected.storagePath && !controls.keepScan ? (
                    <div className="rounded-md border bg-muted/30 p-3 text-sm">
                      <p>
                        <span className="font-medium">Paper receipt:</span> write{' '}
                        <span className="font-mono font-semibold">{selected.auditReferenceId}</span> on the paper receipt and file it.
                        The same number is recorded in the general ledger.
                      </p>
                    </div>
                  ) : null}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Merchant</Label>
                      <Input value={selected.merchantName ?? ''} onChange={(e) => updateSelected({ merchantName: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Ogeemo document number</Label>
                      <Input
                        value={selected.auditReferenceId ?? ''}
                        readOnly
                        className="bg-muted/40 font-mono"
                        title="Assigned automatically and recorded in the general ledger when posted."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Transaction date</Label>
                      <Input type="date" value={selected.transactionDate ?? ''} onChange={(e) => updateSelected({ transactionDate: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Vendor invoice / receipt number</Label>
                      <Input
                        value={selected.vendorDocumentNumber ?? ''}
                        onChange={(e) => updateSelected({ vendorDocumentNumber: e.target.value })}
                        placeholder="Extracted from the source PDF"
                      />
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
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Total amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={selected.totalAmount ?? ''}
                        onChange={(e) => {
                          const totalAmount = Number(e.target.value);
                          updateSelected({ totalAmount, ...taxFieldsForTotal(ocrSettings, selected, totalAmount) });
                        }}
                      />
                    </div>
                    {ocrSettings.taxCalculation === 'from_total' ? (
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Tax type</Label>
                        <Select
                          value={selected.taxChoiceId ?? ''}
                          onValueChange={(choiceId) => updateSelected(taxFieldsForChoice(ocrSettings.taxChoices, choiceId, selected.totalAmount))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose the tax type" />
                          </SelectTrigger>
                          <SelectContent>
                            {ocrSettings.taxChoices.map((choice) => (
                              <SelectItem key={choice.id} value={choice.id}>{choice.name}</SelectItem>
                            ))}
                            <SelectItem value={RECEIPT_TAX_MANUAL}>Enter tax by hand</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {isTaxCalculated(ocrSettings, selected)
                            ? `Tax is calculated from the total at ${selected.taxRate ?? 0}% (tax included in the total).`
                            : selected.taxChoiceId === RECEIPT_TAX_MANUAL
                              ? 'Enter the net and tax amounts yourself.'
                              : 'Choose a tax type and the tax is worked out from the total.'}
                          {typeof selected.printedTaxAmount === 'number' && selected.printedTaxAmount > 0
                            ? ` Printed on the receipt: ${selected.printedTaxAmount.toFixed(2)}.`
                            : ''}
                        </p>
                      </div>
                    ) : null}
                    <div className="space-y-2">
                      <Label>Net amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={selected.netAmount ?? ''}
                        readOnly={isTaxCalculated(ocrSettings, selected)}
                        className={isTaxCalculated(ocrSettings, selected) ? 'bg-muted' : undefined}
                        onChange={(e) => updateSelected({ netAmount: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tax amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={selected.taxAmount ?? ''}
                        readOnly={isTaxCalculated(ocrSettings, selected)}
                        className={isTaxCalculated(ocrSettings, selected) ? 'bg-muted' : undefined}
                        onChange={(e) => updateSelected({ taxAmount: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Paper receipt filed at (optional)</Label>
                      <Input
                        value={selected.paperLocation ?? ''}
                        maxLength={120}
                        onChange={(e) => updateSelected({ paperLocation: e.target.value })}
                        placeholder="For example: Box 3, 2026"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Vendor / company</Label>
                      <Input value={selected.proposedCompany ?? selected.merchantName ?? ''} onChange={(e) => updateSelected({ proposedCompany: e.target.value })} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label>Category</Label>
                        <Dialog
                          open={isAddCategoryOpen}
                          onOpenChange={(open) => {
                            if (addingCategory) return;
                            setIsAddCategoryOpen(open);
                            if (!open) setNewCategoryName('');
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-primary">
                              <Plus className="mr-1 h-4 w-4" />
                              Add category
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <form onSubmit={handleAddCategory} className="space-y-4">
                              <DialogHeader>
                                <DialogTitle>Add expense category</DialogTitle>
                                <DialogDescription>
                                  Save a new category to the dropdown and select it for this receipt. A reference number is assigned automatically.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-2">
                                <Label htmlFor="new-receipt-category">Category name</Label>
                                <Input
                                  id="new-receipt-category"
                                  value={newCategoryName}
                                  onChange={(event) => setNewCategoryName(event.target.value)}
                                  placeholder="e.g., Digital Subscriptions"
                                  autoFocus
                                  disabled={addingCategory}
                                />
                              </div>
                              <DialogFooter className="gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled={addingCategory}
                                  onClick={() => {
                                    setIsAddCategoryOpen(false);
                                    setNewCategoryName('');
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button type="submit" disabled={addingCategory || !newCategoryName.trim()}>
                                  {addingCategory ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                  {addingCategory ? 'Adding...' : 'Add category'}
                                </Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </div>
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
                  <Info className="h-4 w-4 text-primary" />
                  OCR confidence: Not provided by the OCR engine
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => updateSelected({ status: 'reviewed' })} disabled={saving}>
                    {saving ? 'Saving...' : 'Save review'}
                  </Button>
                  <Button
                    onClick={handlePost}
                    disabled={posting || !postingAllowed}
                    title={postingBlockedReason || undefined}
                  >
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
