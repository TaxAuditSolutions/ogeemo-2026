
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const AccountingToolsSkeleton = () => (
    <div className="p-4 sm:p-6 space-y-6">
        <header className="text-center mb-6">
            <Skeleton className="h-8 w-1/2 mx-auto" />
            <Skeleton className="h-4 w-3/4 mx-auto mt-2" />
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-48 w-full" />
            ))}
        </div>
    </div>
);

const AccountingToolsHub = dynamic(
  () => import('@/components/accounting/accounting-tools-view').then((mod) => mod.AccountingToolsView),
  {
    ssr: false,
    loading: () => <AccountingToolsSkeleton />,
  }
);

export default function AccountingToolsHubPage() {
  return <AccountingToolsHub />;
}
