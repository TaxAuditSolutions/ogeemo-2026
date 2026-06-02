'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { LoaderCircle } from 'lucide-react';

const QuoteGeneratorView = dynamic(
  () => import('@/components/accounting/quote-generator-view').then((mod) => mod.QuoteGeneratorView),
  {
    loading: () => (
      <div className="flex h-full w-full items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading Quote Generator...</p>
        </div>
      </div>
    ),
  }
);

export default function CreateQuotePage() {
  return (
    <Suspense fallback={
      <div className="flex h-full w-full items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Initializing Quote Hub...</p>
        </div>
      </div>
    }>
      <QuoteGeneratorView />
    </Suspense>
  );
}
