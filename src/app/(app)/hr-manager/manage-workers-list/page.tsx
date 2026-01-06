
'use client';

import { PayrollEmployeesView } from '@/components/accounting/payroll-employees-view';

// This component is now deprecated, its functionality is served by /accounting/payroll/manage-workers.
// It will now render the same component for consistency.
export default function ManageWorkersListPage() {
  return <PayrollEmployeesView />;
}
