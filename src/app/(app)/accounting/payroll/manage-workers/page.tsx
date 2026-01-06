
import dynamic from 'next/dynamic';
import { LoaderCircle } from 'lucide-react';
import { HrPageHeader } from '@/components/hr/page-header';

const PayrollWorkersView = dynamic(
  () => import('@/components/accounting/payroll-employees-view').then((mod) => mod.PayrollEmployeesView),
  {
    loading: () => (
      <div className="flex h-full w-full items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading Worker Manager...</p>
        </div>
      </div>
    ),
  }
);

export default function ManageWorkersPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
        <HrPageHeader pageTitle="Manage Workers" />
        <PayrollWorkersView />
    </div>
  );
}
