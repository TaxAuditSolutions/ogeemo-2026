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

interface HrPageHeaderProps {
  pageTitle: string;
  hubPath?: '/hr-manager';
  hubLabel?: string;
}

export function HrPageHeader({ pageTitle, hubPath = '/hr-manager', hubLabel = "HR Hub" }: HrPageHeaderProps) {
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
         <Button asChild variant="outline">
            <Link href={hubPath} aria-label={`Back to ${hubLabel}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to {hubLabel}
            </Link>
         </Button>
         <Button asChild>
            <Link href={hubPath}>
                <Landmark className="mr-2 h-4 w-4" />
                Quick Navigation
            </Link>
         </Button>
      </div>
    </div>
  );
}
