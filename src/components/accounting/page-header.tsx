'use client';

import Link from 'next/link';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Landmark, Search } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { FinancialDiscoveryDialog } from './financial-discovery-dialog';

interface AccountingPageHeaderProps {
  pageTitle: string;
  hubPath?: '/accounting' | '/accounting/bks' | '/reports' | '/accounting/tax';
  hubLabel?: string;
  showLoanManagerButton?: boolean;
}

export function AccountingPageHeader({ pageTitle, hubPath = '/accounting', hubLabel: hubLabelProp, showLoanManagerButton = false }: AccountingPageHeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  const defaultHubLabels: Record<string, string> = {
    '/accounting': 'Accounting Hub',
    '/accounting/bks': 'BKS Welcome',
    '/reports': 'Reports',
    '/accounting/tax': 'Tax Center',
  };
  
  const hubLabel = hubLabelProp || defaultHubLabels[hubPath] || 'Accounting Hub';

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Breadcrumb>
                <BreadcrumbList>
                <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                    <Link href="/accounting">Accounting</Link>
                    </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                        <Link href={hubPath}>{hubLabel}</Link>
                    </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                    <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
                </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors" onClick={() => setIsSearchOpen(true)}>
                <Search className="h-4 w-4" />
                <span className="sr-only">Financial Search</span>
            </Button>
        </div>
        <div className="flex items-center gap-2">
            {showLoanManagerButton && (
                <Button asChild variant="outline">
                    <Link href="/accounting/loan-manager">
                    <Landmark className="mr-2 h-4 w-4" /> Back to Loan Manager
                    </Link>
                </Button>
            )}
            <Button asChild>
                <Link href="/accounting">
                    <Landmark className="mr-2 h-4 w-4" />
                    Quick Navigation
                </Link>
            </Button>
            <Button asChild>
                <Link href={hubPath}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to {hubLabel}
                </Link>
            </Button>
        </div>
      </div>
      <FinancialDiscoveryDialog isOpen={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </>
  );
}
