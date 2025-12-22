
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

interface ReportsPageHeaderProps {
  pageTitle: string;
  hubPath?: string;
  hubLabel?: string;
}

export function ReportsPageHeader({ 
    pageTitle, 
    hubPath = "/reports", 
    hubLabel = "Reports Hub" 
}: ReportsPageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
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
        <Button variant="outline">Test</Button>
        <Button asChild variant="outline">
          <Link href={hubPath}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {hubLabel}
          </Link>
        </Button>
      </div>
    </div>
  );
}
