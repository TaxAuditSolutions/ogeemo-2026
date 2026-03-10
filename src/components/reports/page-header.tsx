
'use client';

import Link from 'next/link';
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Landmark, ClipboardList } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface ReportsPageHeaderProps {
  pageTitle: string;
  hubPath?: string;
  hubLabel?: string;
}

export function ReportsPageHeader({ pageTitle, hubPath = "/reports", hubLabel = "Reports Hub" }: ReportsPageHeaderProps) {
  const targetHub = hubPath.includes('hr') ? '/hr-manager' : hubPath;
  const targetLabel = hubPath.includes('hr') ? 'Quick Navigation' : hubLabel;

  return (
    <div className="flex items-center justify-between print:hidden">
      <Breadcrumb>
        <BreadcrumbList>
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
        <Button asChild variant="outline">
            <Link href="/reports">
                <ClipboardList className="mr-2 h-4 w-4" />
                Reports Hub
            </Link>
        </Button>
        <Button asChild>
            <Link href={targetHub}>
            <Landmark className="mr-2 h-4 w-4" />
            {targetLabel}
            </Link>
        </Button>
      </div>
    </div>
  );
}
