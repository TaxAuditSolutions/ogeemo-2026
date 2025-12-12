
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const DataSkeleton = () => (
    <div className="space-y-6 p-4 sm:p-6">
        <Skeleton className="h-8 w-1/3" />
        <div className="rounded-md border">
            <div className="p-4">
                <Skeleton className="h-6 w-1/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex justify-between">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-1/4" />
                    </div>
                ))}
            </div>
        </div>
    </div>
);


const DataView = dynamic(
  () => import('@/components/data/data-view').then((mod) => mod.DataView),
  {
    ssr: false,
    loading: () => <DataSkeleton />,
  }
);

export default function DataPage() {
  return <DataView />;
}
