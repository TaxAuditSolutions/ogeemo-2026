import { PayrollEmployeesView } from '@/components/accounting/payroll-employees-view';

/**
 * Workers landing page — the target of the "Workers" chip.
 *
 * The directory view is self-contained (header, worker table, Add/Edit/Merge,
 * and quick links into the Time Log report, Run Payroll and Contacts Hub),
 * so this page is just its shell. Replaces the old manage-workers route,
 * which redirected into Contacts and collected no payroll details.
 */
export default function WorkersPage() {
    return (
        <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
            <PayrollEmployeesView />
        </div>
    );
}