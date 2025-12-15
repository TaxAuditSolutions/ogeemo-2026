'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CalendarOff } from "lucide-react";

export default function TimeOffPage() {
    return (
        <div className="p-4 sm:p-6 flex flex-col items-center h-full">
            <header className="text-center mb-6">
                <div className="flex justify-center items-center gap-4 mb-2">
                    <CalendarOff className="h-10 w-10 text-primary" />
                    <h1 className="text-3xl font-bold font-headline text-primary">Time Off & Leave Management</h1>
                </div>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                    This feature is currently under construction.
                </p>
            </header>
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle>Coming Soon</CardTitle>
                    <CardDescription>A system to manage vacation, sick days, and other employee leave requests.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                        <p>Functionality for this module will be built out here.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
