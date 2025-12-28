'use client';

import * as React from 'react';
import { AccountingPageHeader } from "@/components/accounting/page-header";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CalendarTestPage() {
    const [date, setDate] = React.useState<Date | undefined>(new Date());

    return (
        <div className="p-4 sm:p-6 space-y-6 flex flex-col items-center">
            <div className="w-full max-w-4xl">
              <AccountingPageHeader pageTitle="Calendar Test" hubPath="/accounting/payroll" hubLabel="Payroll Hub" />
            </div>
            
            <Card className="max-w-md">
                <CardHeader>
                    <CardTitle>Test Calendar</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        className="rounded-md border"
                    />
                </CardContent>
            </Card>
        </div>
    );
}
