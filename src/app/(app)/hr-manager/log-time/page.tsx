'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

export default function LogEmployeeTimePage() {
    return (
        <div className="p-4 sm:p-6 flex flex-col items-center h-full">
            <header className="w-full max-w-4xl text-center mb-6 relative">
                <h1 className="text-3xl font-bold font-headline text-primary">Log Worker Time</h1>
                <p className="text-muted-foreground">Log hours for a worker or contractor for payroll.</p>
                <div className="absolute top-1/2 left-0 -translate-y-1/2">
                    <Button asChild variant="outline">
                        <Link href="/hr-manager">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to HR Hub
                        </Link>
                    </Button>
                </div>
            </header>
            <Card className="w-full max-w-4xl">
                <CardContent className="p-8 text-center text-muted-foreground">
                    <p>This feature is currently under construction.</p>
                </CardContent>
            </Card>
        </div>
    );
}
