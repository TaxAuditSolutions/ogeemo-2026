'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { LoaderCircle } from 'lucide-react';

const CreateLeadContent = dynamic(
  () => import('@/components/crm/create-lead-content').then((mod) => mod.default),
  {
    loading: () => (
      <div className="flex h-full w-full items-center justify-center p-4">
        <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
      </div>
    ),
  }
);

export default function CreateLeadPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><LoaderCircle className="h-10 w-10 animate-spin text-primary" /></div>}>
      <CreateLeadContent />
    </Suspense>
  );
}
