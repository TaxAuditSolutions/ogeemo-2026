
'use client';

import dynamic from 'next/dynamic';
import { LoaderCircle } from 'lucide-react';

const TimeLogReportView = dynamic(
  () => import('@/components/reports/time-log-report').then((mod) => mod.TimeLogReport),
  {
    loading: () => (
      <div className="flex h-full w-full items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading Time Log Report...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
);

export default function TimeLogReportPage() {
  return <TimeLogReportView />;
}
