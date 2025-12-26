'use client';

import dynamic from 'next/dynamic';
import { LoaderCircle } from 'lucide-react';

const BalanceIncomeSummaryView = dynamic(
  () => import('@/components/accounting/balance-income-summary-view').then((mod) => mod.BalanceIncomeSummaryView),
  {
    loading: () => (
      <div className="flex h-full w-full items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading Summary...</p>
        </div>
      </div>
    ),
  }
);

export default function BalanceIncomeSummaryPage() {
  return <BalanceIncomeSummaryView />;
}
