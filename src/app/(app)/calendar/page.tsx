
'use client';

import dynamic from 'next/dynamic';
import { CalendarSkeleton } from '@/components/calendar/calendar-skeleton';

const CalendarView = dynamic(
  () => import('@/components/calendar/calendar-view').then((mod) => mod.CalendarView),
  {
    ssr: false,
    loading: () => <CalendarSkeleton />,
  }
);

export default function CalendarPage() {
  return <CalendarView />;
}
