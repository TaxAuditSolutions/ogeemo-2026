'use client';

import { AccountingPageHeader } from "@/components/accounting/page-header";

export default function CalendarTestPage() {
    return (
        <div className="p-4 sm:p-6 space-y-6 flex flex-col items-center">
            <div className="w-full max-w-4xl">
              <AccountingPageHeader pageTitle="Calendar Test" hubPath="/accounting/payroll" hubLabel="Payroll Hub" />
            </div>
        </div>
    );
}
