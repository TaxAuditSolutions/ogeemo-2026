
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
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
  hubPath?: string;
  hubLabel?: string;
}

export function AccountingPageHeader({ pageTitle, hubPath = "/accounting/accounts-receivable", hubLabel = "Accounts Receivable" }: AccountingPageHeaderProps) {
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
      <Button asChild variant="outline">
        <Link href={hubPath} aria-label={`Return to ${hubLabel}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to A/R
        </Link>
      </Button>
    </div>
  );
}
