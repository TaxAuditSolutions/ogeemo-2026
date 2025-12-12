
import dynamic from 'next/dynamic';
import { LoaderCircle } from 'lucide-react';

const PayrollRemittancesView = dynamic(
  () => import('@/components/accounting/payroll-remittances-view').then((mod) => mod.PayrollRemittancesView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading Payroll Remittances...</p>
        </div>
      </div>
    ),
  }
);

export default function PayrollRemittancesPage() {
  return <PayrollRemittancesView />;
}
