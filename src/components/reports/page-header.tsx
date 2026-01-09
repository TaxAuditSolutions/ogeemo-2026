
'use client';

import Link from 'next/link';
import React from 'react';
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

export function ReportsPageHeader({ pageTitle, hubPath = "/action-manager", hubLabel = "Action Manager" }: ReportsPageHeaderProps) {
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
      <Button asChild>
        <Link href={hubPath}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {hubLabel}
        </Link>
      </Button>
    </div>
  );
}
