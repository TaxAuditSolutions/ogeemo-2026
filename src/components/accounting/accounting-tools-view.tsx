
"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
  Calculator,
  Settings,
  Info,
} from 'lucide-react';
import accountingMenuItems from '@/data/accounting-menu-items';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

export function AccountingToolsView() {
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  
  const hubFeatureHrefs = [
    "/accounting/bks",
    "/accounting/accounts-receivable",
    "/accounting/accounts-payable",
    "/accounting/payroll/run",
    "/accounting/payroll/manage-workers",
    "/accounting/invoices/create",
    "/accounting/financial-snapshot",
    "/accounting/invoicing-report",
    "/accounting/bks-instructions",
    // Added reports
    "/accounting/reports/income-statement",
    "/accounting/reports/accrual-adjustments",
    "/reports/client-statement",
    "/reports/time-log",
];

  const hubFeatures = accountingMenuItems
    .filter(item => hubFeatureHrefs.includes(item.href))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6">
        <header className="text-center mb-6">
          <div className="flex justify-center items-center gap-2 mb-2">
              <Calculator className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold font-headline text-primary">
                Accounting Hub
              </h1>
              <Button variant="ghost" size="icon" onClick={() => setIsInfoOpen(true)}>
                <Info className="h-5 w-5 text-muted-foreground" />
                <span className="sr-only">About the Accounting Hub</span>
              </Button>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Your central command for managing finances. Use the cards below to navigate to key areas.
          </p>
          <div className="mt-4">
              <Button asChild>
                  <Link href="/accounting/manage-navigation">
                    <Settings className="mr-2 h-4 w-4"/>
                    Manage Quick Navigation
                  </Link>
              </Button>
          </div>
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {hubFeatures.map((item) => {
            let description, cta;
            switch(item.href) {
                case "/accounting/ledgers":
                    description = "Go to BKS Entries";
                    cta = "Go to BKS Ledger";
                    break;
                case "/accounting/invoicing-report":
                    description = "Filter Invoices";
                    cta = "Go to Invoicing Report";
                    break;
                 case "/accounting/bks-instructions":
                    description = "Learn how to use the BKS Ledgers";
                    cta = "View Instructions";
                    break;
                case "/accounting/bks": // Kept for backward compatibility
                    description = "Go to BKS Entries";
                    cta = "Go to BKS Ledger";
                    break;
                default:
                    description = `Manage ${item.label.toLowerCase()}`;
                    cta = `Go to ${item.label}`;
            }

            return (
              <FeatureCard 
                key={item.href}
                icon={item.icon}
                title={item.label}
                description={description}
                href={item.href}
                cta={cta}
              />
            );
          })}
        </div>
      </div>
      <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>About the Accounting Hub</DialogTitle>
                  <DialogDescription>
                      This is your main center for all financial activities.
                  </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                  <p className="text-sm text-muted-foreground">
                      From here, you can access your BKS ledgers, manage invoices and bills, process payroll for your team, and generate financial reports to understand your business's performance. Use the cards as shortcuts to each specific accounting module.
                  </p>
              </div>
              <DialogFooter>
                  <Button onClick={() => setIsInfoOpen(false)}>Close</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </>
  );
}
