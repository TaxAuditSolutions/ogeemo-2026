
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';

export default function CalendarTestPage() {
    const [date, setDate] = useState<Date | undefined>(new Date());

    return (
        <div className="p-8 flex items-center justify-center">
            <Card>
                <CardHeader>
                    <CardTitle>Calendar Test</CardTitle>
                </CardHeader>
                <CardContent>
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
