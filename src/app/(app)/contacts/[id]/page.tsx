'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { ContactsSkeleton } from '@/components/contacts/contacts-skeleton';

const ClientRecordView = dynamic(
  () => import('@/components/contacts/client-record-view').then((mod) => mod.ClientRecordView),
  {
    loading: () => <ContactsSkeleton />,
  }
);

export default function ClientRecordPage() {
  return (
    <Suspense fallback={<ContactsSkeleton />}>
      <ClientRecordView />
    </Suspense>
  );
}
