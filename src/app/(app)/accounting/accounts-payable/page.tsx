'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { LoaderCircle } from 'lucide-react';

const AccountsPayablePageView = dynamic(
  () => import('@/components/accounting/accounts-payable-page-view').then((mod) => mod.AccountsPayablePageView),
  {
    loading: () => (
      <div className="flex h-full w-full items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading Accounts Payable...</p>
        </div>
      </div>
    ),
  }
);

export default function AccountsPayablePage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><LoaderCircle className="h-10 w-10 animate-spin text-primary" /></div>}>
      <AccountsPayablePageView />
    </Suspense>
  );
}
