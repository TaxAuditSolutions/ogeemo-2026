'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { LoaderCircle } from 'lucide-react';

const TimeManagerView = dynamic(
  () => import('@/components/time/time-manager-view').then((mod) => mod.TimeManagerView),
  {
    loading: () => (
      <div className="flex h-full w-full items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading Master Mind...</p>
        </div>
      </div>
    ),
  }
);

export default function MasterMindPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full w-full items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Initializing Master Mind...</p>
        </div>
      </div>
    }>
      <TimeManagerView />
    </Suspense>
  );
}
