'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CrmPlanPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6 h-full flex flex-col">
      <header className="flex items-center justify-between">
        <div className="w-1/4">
             <Button asChild variant="outline">
                <Link href="/crm">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to CRM Hub
                </Link>
            </Button>
        </div>
        <div className="text-center flex-1">
            <h1 className="text-3xl font-bold font-headline text-primary">
                The CRM Plan
            </h1>
        </div>
        <div className="w-1/4" />
      </header>
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <Card>
            <CardHeader>
                <CardTitle>Phase 1: Lead Capture</CardTitle>
                <CardDescription>Strategies for attracting and capturing new leads.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">Details about lead magnets, website forms, and social media campaigns will go here.</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Phase 2: Nurturing & Qualification</CardTitle>
                <CardDescription>Automated email sequences and lead scoring.</CardDescription>
            </CardHeader>
            <CardContent>
                 <p className="text-sm text-muted-foreground">Content for nurturing sequences and criteria for identifying qualified leads will be detailed here.</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Phase 3: Sales Pipeline</CardTitle>
                <CardDescription>Managing deals through the visual sales pipeline.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">Definitions of pipeline stages and actions for moving deals forward will be outlined here.</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Phase 4: Customer Retention</CardTitle>
                <CardDescription>Post-sale follow-ups and loyalty programs.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">Plans for customer onboarding, check-ins, and strategies for repeat business will be described here.</p>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
