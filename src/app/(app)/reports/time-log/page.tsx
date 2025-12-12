
'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportsPageHeader } from '@/components/reports/page-header';

const TimeLogReport = dynamic(
  () => import('@/components/reports/time-log-report').then((mod) => mod.TimeLogReport),
  {
    ssr: false,
    loading: () => <div className="p-4"><p>Loading Report...</p></div>,
  }
);


export default function TimeLogReportPage() {
  return (
    <>
        <div className="p-4 sm:p-6 space-y-6">
            <ReportsPageHeader pageTitle="Time Log Report" />
            <TimeLogReport />
        </div>
    </>
  );
}
