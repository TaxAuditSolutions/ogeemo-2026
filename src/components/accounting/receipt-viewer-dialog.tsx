'use client';

import * as React from 'react';
import { ExternalLink, LoaderCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { receiptFileUrl } from '@/lib/receipt-storage-utils';

interface ReceiptViewerDialogProps {
  /** Queue id of the stored receipt; the dialog is closed while this is null. */
  receiptId: string | null;
  /** The Ogeemo document number shown in the title (for example REC-20261031-001). */
  documentNumber?: string;
  onClose: () => void;
}

type ViewerState =
  | { status: 'loading' }
  | { status: 'ready'; url: string; isPdf: boolean }
  | { status: 'error'; message: string };

/**
 * Shows the permanent copy of a scanned receipt. The file is fetched through the
 * authenticated receipts route (same workspace only) and shown from a temporary
 * browser URL that is released when the dialog closes.
 */
export function ReceiptViewerDialog({ receiptId, documentNumber, onClose }: ReceiptViewerDialogProps) {
  const [state, setState] = React.useState<ViewerState>({ status: 'loading' });

  React.useEffect(() => {
    if (!receiptId) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    setState({ status: 'loading' });

    (async () => {
      try {
        const response = await fetch(receiptFileUrl(receiptId), { cache: 'no-store' });
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

  const title = documentNumber ? `Receipt ${documentNumber}` : 'Receipt';

  return (
    <Dialog open={!!receiptId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="flex h-[92vh] max-w-5xl flex-col gap-3">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>The permanent copy stored with this ledger entry.</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto rounded-md border bg-muted/30">
          {state.status === 'loading' && (
            <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
              <LoaderCircle className="h-5 w-5 animate-spin" /> Loading receipt...
            </div>
          )}
          {state.status === 'error' && (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center" role="alert">
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

        <DialogFooter className="gap-2">
          {state.status === 'ready' && (
            <Button asChild variant="outline">
              <a href={state.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in new tab
              </a>
            </Button>
          )}
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
