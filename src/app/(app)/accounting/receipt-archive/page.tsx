'use client';

import dynamic from 'next/dynamic';
import { LoaderCircle } from 'lucide-react';

const ReceiptArchiveView = dynamic(
  () => import('@/components/accounting/receipt-archive-view').then((mod) => mod.ReceiptArchiveView),
  {
    loading: () => (
      <div className="flex h-full w-full items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading Receipt Archive...</p>
        </div>
      </div>
    ),
  }
);

export default function ReceiptArchivePage() {
  return <ReceiptArchiveView />;
}
