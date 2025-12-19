'use client';

import dynamic from 'next/dynamic';
import type { Metadata } from 'next';
import { Skeleton } from '@/components/ui/skeleton';

// export const metadata: Metadata = {
//   title: "Time Log Report",
// };

const TimeLogReport = dynamic(
  () => import('@/components/reports/time-log-report').then((mod) => mod.TimeLogReport),
  {
    loading: () => <div className="p-4"><p>Loading Report...</p></div>,
  }
);


export default function TimeLogReportPage() {
  return (
    <>
        <div className="p-4 sm:p-6 space-y-6">
            <TimeLogReport />
        </div>
    </>
  );
}
