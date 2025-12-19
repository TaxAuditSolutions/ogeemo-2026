
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
                <CardTitle></CardTitle>
                <CardDescription></CardDescription>
            </CardHeader>
            <CardContent>
                 <p className="text-sm text-muted-foreground"></p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle></CardTitle>
                <CardDescription></CardDescription>
            </CardHeader>
            <CardContent>
                 <p className="text-sm text-muted-foreground"></p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle></CardTitle>
                <CardDescription></CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground"></p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle></CardTitle>
                <CardDescription></CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground"></p>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
