'use client';

import Link from 'next/link';
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Landmark } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface AccountingPageHeaderProps {
  pageTitle: string;
  hubPath?: '/accounting' | '/accounting/bks' | '/reports' | '/accounting/tax';
  hubLabel?: string;
  showLoanManagerButton?: boolean;
}

export function AccountingPageHeader({ pageTitle, hubPath = '/accounting', hubLabel: hubLabelProp, showLoanManagerButton = false }: AccountingPageHeaderProps) {
  
  const defaultHubLabels: Record<string, string> = {
    '/accounting': 'Accounting Hub',
    '/accounting/bks': 'BKS Welcome',
    '/reports': 'Reports',
    '/accounting/tax': 'Tax Center',
  };
  
  const hubLabel = hubLabelProp || defaultHubLabels[hubPath] || 'Accounting Hub';

  return (
    <div className="flex items-center justify-between">
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
  );
}
