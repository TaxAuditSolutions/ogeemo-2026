'use client';

import * as React from 'react';
import { DayPicker } from "react-day-picker";
import 'react-day-picker/dist/style.css';
import { ChevronLeft, ChevronRight } from "lucide-react";

import { AccountingPageHeader } from "@/components/accounting/page-header";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export default function CalendarTestPage() {
    const [date, setDate] = React.useState<Date | undefined>(new Date());

    return (
        <div className="p-4 sm:p-6 space-y-6 flex flex-col items-center">
            <div className="w-full max-w-4xl">
              <AccountingPageHeader pageTitle="Calendar Test" hubPath="/accounting/payroll" hubLabel="Payroll Hub" />
            </div>
            
            <Card className="max-w-md">
                <CardHeader>
                    <CardTitle>Isolated Calendar Test</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center">
                    <DayPicker
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        className="rounded-md border bg-card text-card-foreground"
                        classNames={{
                            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                            month: "space-y-4",
                            caption: "flex justify-center pt-1 relative items-center",
                            caption_label: "text-sm font-medium",
                            nav: "space-x-1 flex items-center",
                            nav_button: cn(
                              buttonVariants({ variant: "outline" }),
                              "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                            ),
                            nav_button_previous: "absolute left-1",
                            nav_button_next: "absolute right-1",
                            table: "w-full border-collapse space-y-1",
                            head_row: "flex",
                            head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                            row: "flex w-full mt-2",
                            cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                            day: cn(
                              buttonVariants({ variant: "ghost" }),
                              "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
                            ),
                            day_selected:
                              "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                            day_today: "bg-accent text-accent-foreground",
                            day_outside: "text-muted-foreground opacity-50",
                            day_disabled: "text-muted-foreground opacity-50",
                            day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                        }}
                        components={{
                            IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
                            IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
                        }}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
