
'use client';

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
  FileText,
  Percent,
  Users,
  ShieldCheck,
  FileSignature,
  WalletCards,
} from 'lucide-react';
import { AccountingPageHeader } from '@/components/accounting/page-header';

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  cta: string;
  disabled?: boolean;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, description, href, cta, disabled }) => (
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
      <Button asChild className="w-full" disabled={disabled}>
        <Link href={href}>
          {cta}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </CardFooter>
  </Card>
);

export default function TaxCenterPage() {
  const features = [
    { 
      icon: FileText, 
      title: "Income Statement", 
      description: "Generate a statement of your business income and expenses for tax purposes.", 
      href: "/accounting/reports/income-statement", 
      cta: "Generate Statement",
      disabled: false,
    },
    {
      icon: FileSignature,
      title: "Manage Tax Categories",
      description: "Customize and manage your income and expense categories to align with tax forms.",
      href: "/accounting/tax/categories",
      cta: "Manage Categories",
      disabled: false,
    },
    { 
      icon: WalletCards, 
      title: "Capital Assets (CCA)", 
      description: "Manage capital assets and depreciation to calculate your Capital Cost Allowance.", 
      href: "/accounting/asset-management", 
      cta: "Manage Assets",
      disabled: false,
    },
    { 
      icon: Percent, 
      title: "Sales Tax Calculator", 
      description: "Review sales tax collected and paid, and prepare your remittance information.", 
      href: "/accounting/tax/sales-tax", 
      cta: "Manage Sales Tax",
      disabled: false,
    },
    { 
      icon: Users, 
      title: "Payroll Remittances", 
      description: "View and manage your payroll tax and source deduction remittances.", 
      href: "/accounting/tax/payroll-remittances", 
      cta: "Manage Payroll Tax",
      disabled: false,
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <AccountingPageHeader pageTitle="Tax Center" />
      <header className="text-center mb-6">
        <div className="flex justify-center items-center gap-4 mb-2">
            <ShieldCheck className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold font-headline text-primary">
            Tax Center
            </h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Your hub for generating tax forms and reviewing remittance information.
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
