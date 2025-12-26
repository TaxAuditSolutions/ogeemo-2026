
'use client';

import dynamic from 'next/dynamic';
import { LoaderCircle } from 'lucide-react';
import { ReportsPageHeader } from '@/components/reports/page-header';

const IncomeStatementView = dynamic(
  () => import('@/components/accounting/income-statement-view').then((mod) => mod.IncomeStatementView),
  {
    loading: () => (
      <div className="flex h-full w-full items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading Income Statement...</p>
        </div>
      </div>
    ),
    ssr: false, // Disable SSR for this component as it fetches client-side data
  }
);

export default function IncomeStatementPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <ReportsPageHeader pageTitle="Income Statement" />
      <IncomeStatementView />
    </div>
  );
}
