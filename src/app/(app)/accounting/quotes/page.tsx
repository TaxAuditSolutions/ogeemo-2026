'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { LoaderCircle } from 'lucide-react';

const QuotesPageView = dynamic(
  () => import('@/components/accounting/quotes-page-view').then((mod) => mod.QuotesPageView),
  {
    loading: () => (
      <div className="flex h-full w-full items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading Quotes...</p>
        </div>
      </div>
    ),
  }
);

export default function QuotesPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full w-full items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Initializing Quotes Hub...</p>
        </div>
      </div>
    }>
      <QuotesPageView />
    </Suspense>
  );
}
