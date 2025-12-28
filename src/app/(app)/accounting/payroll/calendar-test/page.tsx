'use client';

import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css'; // Use the library's base stylesheet
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { AccountingPageHeader } from '@/components/accounting/page-header';

export default function CalendarTestPage() {
    const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const gridCells = Array.from({ length: 35 }); // 7x5 grid

    return (
        <div className="p-4 sm:p-6 space-y-6 flex flex-col items-center">
            <div className="w-full max-w-4xl">
              <AccountingPageHeader pageTitle="Calendar Test" hubPath="/accounting/payroll" hubLabel="Payroll Hub" />
            </div>
            <div className="flex flex-col items-center gap-4 pt-8">
                <h2 className="text-xl font-semibold">Test Grid Frame</h2>
                <div className="p-4 border rounded-lg bg-background">
                    <div className="h-9 mb-2 flex items-center justify-center bg-muted border rounded-md">
                      {/* This is the new row */}
                    </div>
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {daysOfWeek.map((day, index) => (
                            <div key={index} className="h-9 w-16 bg-primary/10 border flex items-center justify-center text-xs text-primary font-semibold rounded-md">
                                {day}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {gridCells.map((_, index) => (
                            <div key={index} className="h-16 w-16 bg-muted border flex items-center justify-center text-xs text-muted-foreground rounded-md">
                                {index + 1}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
