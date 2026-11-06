'use client';

import * as React from 'react';
import { ExternalLink, LoaderCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { receiptFileUrl } from '@/lib/receipt-storage-utils';
import { fetchWithSession } from '@/lib/server-session';

interface ReceiptPreviewProps {
  /** Queue id of the stored receipt. */
  receiptId: string;
  /** Accessible title for the embedded file. */
  title: string;
  /** Height classes for the preview area; the default fills its parent. */
  className?: string;
}

type ViewerState =
  | { status: 'loading' }
  | { status: 'ready'; url: string; isPdf: boolean }
  | { status: 'error'; message: string };

/**
 * The original scanned receipt itself, not a form of its values. The file is
 * fetched through the authenticated receipts route (same workspace only) and
 * shown from a temporary browser URL that is released when this unmounts.
 */
export function ReceiptPreview({ receiptId, title, className = 'h-full' }: ReceiptPreviewProps) {
  const [state, setState] = React.useState<ViewerState>({ status: 'loading' });

  React.useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setState({ status: 'loading' });

    (async () => {
      try {
        const response = await fetchWithSession(receiptFileUrl(receiptId), { cache: 'no-store' });
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error || `The receipt could not be loaded (${response.status}).`);
        }
        const blob = await response.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setState({ status: 'ready', url: objectUrl, isPdf: blob.type === 'application/pdf' });
      } catch (error: any) {
        if (!cancelled) setState({ status: 'error', message: error?.message || 'The receipt could not be loaded.' });
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [receiptId]);

  return (
    <div className={`flex min-h-0 flex-col gap-2 ${className}`}>
      <div className="min-h-0 flex-1 overflow-auto rounded-md border bg-muted/30">
        {state.status === 'loading' && (
          <div className="flex h-full min-h-[8rem] items-center justify-center gap-2 text-muted-foreground">
            <LoaderCircle className="h-5 w-5 animate-spin" /> Loading receipt...
          </div>
        )}
        {state.status === 'error' && (
          <div className="flex h-full min-h-[8rem] flex-col items-center justify-center gap-2 p-6 text-center" role="alert">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="font-medium">This receipt could not be shown.</p>
            <p className="text-sm text-muted-foreground">{state.message}</p>
          </div>
        )}
        {state.status === 'ready' && (
          state.isPdf ? (
            <iframe src={state.url} title={title} className="h-full w-full" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={state.url} alt={title} className="mx-auto max-h-full max-w-full object-contain" />
          )
        )}
      </div>
      {state.status === 'ready' && (
        <div className="flex justify-end">
          <Button asChild variant="outline" size="sm">
            <a href={state.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in new tab
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}

interface ReceiptViewerDialogProps {
  /** Queue id of the stored receipt; the dialog is closed while this is null. */
  receiptId: string | null;
  /** The Ogeemo document number shown in the title (for example REC-20261031-001). */
  documentNumber?: string;
  onClose: () => void;
}

/** Full-size dialog showing the permanent copy of a scanned receipt. */
export function ReceiptViewerDialog({ receiptId, documentNumber, onClose }: ReceiptViewerDialogProps) {
  const title = documentNumber ? `Receipt ${documentNumber}` : 'Receipt';

  return (
    <Dialog open={!!receiptId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="flex h-[92vh] max-w-5xl flex-col gap-3">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>The original scanned receipt stored with this ledger entry.</DialogDescription>
        </DialogHeader>

        {receiptId && <ReceiptPreview key={receiptId} receiptId={receiptId} title={title} className="flex-1" />}

        <DialogFooter className="gap-2">
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
