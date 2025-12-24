
'use client';

import dynamic from 'next/dynamic';
import { LoaderCircle } from 'lucide-react';
import { AccountingPageHeader } from '@/components/accounting/page-header';

const AccountsReceivablePageView = dynamic(
  () => import('@/components/accounting/accounts-receivable-page-view').then((mod) => mod.AccountsReceivablePageView),
  {
    loading: () => (
      <div className="flex h-full w-full items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading Accounts Receivable...</p>
        </div>
      </div>
    ),
  }
);

export default function AccountsReceivablePage() {
  return <AccountsReceivablePageView />;
}
