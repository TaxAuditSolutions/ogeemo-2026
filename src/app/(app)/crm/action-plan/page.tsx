
'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const ActionColumn = ({ title }: { title: string }) => (
    <Card className="flex flex-col">
        <CardHeader>
            <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 space-y-2">
            <div className="text-sm text-muted-foreground text-center pt-8 h-full">
                <p>No items in this stage.</p>
            </div>
        </CardContent>
    </Card>
);

export default function CrmActionPlanPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const leadName = searchParams.get('leadName');

    return (
        <div className="p-4 sm:p-6 space-y-6 h-full flex flex-col">
            <header className="flex items-center justify-between">
                <div className="w-1/4">
                    <Button asChild variant="outline">
                        <Link href="/crm/plan">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to CRM Plan
                        </Link>
                    </Button>
                </div>
                <div className="text-center flex-1">
                    <h1 className="text-3xl font-bold font-headline text-primary">
                        CRM Action Plan: {leadName || 'New Plan'}
                    </h1>
                    <p className="text-muted-foreground">Manage the next steps for your leads.</p>
                </div>
                <div className="w-1/4" />
            </header>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <ActionColumn title="To Do" />
                <ActionColumn title="In Progress" />
                <ActionColumn title="Done" />
            </div>
        </div>
    );
}
