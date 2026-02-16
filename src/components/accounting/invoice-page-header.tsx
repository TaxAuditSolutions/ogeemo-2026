'use client';

import Link from 'next/link';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Search } from 'lucide-react';
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
  hubPath?: string;
  hubLabel?: string;
}

export function InvoicePageHeader({ pageTitle, hubPath = "/accounting/accounts-receivable", hubLabel = "Accounts Receivable" }: AccountingPageHeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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
        <Button asChild variant="outline">
            <Link href={hubPath} aria-label={`Return to ${hubLabel}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to A/R
            </Link>
        </Button>
      </div>
      <FinancialDiscoveryDialog isOpen={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </>
  );
}
