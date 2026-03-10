
'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { LoaderCircle } from 'lucide-react';

const WorkActivityView = dynamic(
  () => import('@/components/reports/work-activity-view').then((mod) => mod.WorkActivityView),
  {
    loading: () => (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center space-y-4">
          <LoaderCircle className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Assembling activity nodes...</p>
        </div>
      </div>
    ),
  }
);

export default function WorkActivityPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><LoaderCircle className="h-10 w-10 animate-spin text-primary" /></div>}>
      <WorkActivityView />
    </Suspense>
  );
}
