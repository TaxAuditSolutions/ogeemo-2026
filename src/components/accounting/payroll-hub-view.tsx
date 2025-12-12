
"use client";

import React from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Users,
  PlayCircle,
  History,
  Landmark,
  Settings,
  Banknote,
} from 'lucide-react';
import { AccountingPageHeader } from './page-header';

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  cta: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, description, href, cta }) => (
  <Card className="flex flex-col">
    <CardHeader>
      <div className="flex items-start gap-4">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="mt-1">{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="flex-1" />
    <CardFooter>
      <Button asChild className="w-full">
        <Link href={href}>
          {cta}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </CardFooter>
  </Card>
);

export function PayrollHubView() {
  const features = [
    { icon: Users, title: "Manage Employees", description: "Add, edit, and manage all your employee profiles and payroll information.", href: "/accounting/payroll/employees", cta: "Go to Employees" },
    { icon: PlayCircle, title: "Run Payroll", description: "Start a new payroll run, calculate earnings, deductions, and issue payments.", href: "/accounting/payroll/run", cta: "Start New Run" },
    { icon: History, title: "Payroll History & Reports", description: "View past payroll runs, generate pay stubs, and create detailed reports.", href: "/accounting/payroll/history", cta: "View History" },
    { icon: Landmark, title: "Tax Forms & Remittances", description: "Manage and record your tax payments for payroll and sales tax.", href: "/accounting/tax", cta: "Manage Taxes" },
    { icon: Settings, title: "Payroll Settings", description: "Configure company details, pay schedules, and payroll-related accounts.", href: "/accounting/payroll/settings", cta: "Configure Settings" },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <AccountingPageHeader pageTitle="Payroll Hub" hubLabel="Accounting Tools" />
      <header className="text-center mb-6">
        <div className="flex justify-center items-center gap-4 mb-2">
            <Banknote className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold font-headline text-primary">
            Payroll Hub
            </h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Your central command for all payroll-related activities, from managing employees to filing taxes.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {features.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </div>
    </div>
  );
}
