
import dynamic from 'next/dynamic';
import { LoaderCircle } from 'lucide-react';

const LedgersView = dynamic(
  () => import('@/components/accounting/ledgers-view').then((mod) => mod.LedgersView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading General Ledger...</p>
        </div>
      </div>
    ),
  }
);

export default function LedgersPage() {
  return <LedgersView />;
}
