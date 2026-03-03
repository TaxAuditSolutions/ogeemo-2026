
'use client';

import dynamic from 'next/dynamic';
import { LoaderCircle } from 'lucide-react';

const CashAccountingView = dynamic(
  () => import('@/components/accounting/cash-accounting-view').then((mod) => mod.CashAccountingView),
  {
    loading: () => (
      <div className="flex h-full w-full items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading Petty Cash Hub...</p>
        </div>
      </div>
    ),
  }
);

export default function PettyCashPage() {
  return <CashAccountingView />;
}
