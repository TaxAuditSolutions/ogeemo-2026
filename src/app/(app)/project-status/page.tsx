
'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const ProjectStatusSkeleton = () => (
    <div className="space-y-6 p-4 sm:p-6">
        <header className="text-center">
            <Skeleton className="h-8 w-1/2 mx-auto" />
            <Skeleton className="h-4 w-3/4 mx-auto mt-2" />
        </header>
        <div className="space-y-6">
           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
            <Skeleton className="h-96 w-full" />
        </div>
    </div>
);


const ProjectStatusView = dynamic(
  () => import('@/components/dashboard/project-status-view').then((mod) => mod.ProjectStatusView),
  {
    ssr: false,
    loading: () => <ProjectStatusSkeleton />,
  }
);


export default function ProjectStatusPage() {
  return <ProjectStatusView />;
}
