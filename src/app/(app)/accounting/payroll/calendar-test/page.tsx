'use client';

import { AccountingPageHeader } from "@/components/accounting/page-header";

export default function CalendarTestPage() {
    return (
        <div className="p-4 sm:p-6 space-y-6">
            <AccountingPageHeader pageTitle="Calendar Test" hubPath="/accounting/payroll" hubLabel="Payroll Hub" />
            <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">This is the calendar test page.</p>
            </div>
        </div>
    );
}
