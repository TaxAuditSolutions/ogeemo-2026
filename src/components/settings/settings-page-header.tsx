
'use client';

import Link from 'next/link';
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Globe } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface SettingsPageHeaderProps {
  pageTitle: string;
}

export function SettingsPageHeader({ pageTitle }: SettingsPageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/settings">Settings</Link>
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
          <Link href="/website">
            <Globe className="mr-2 h-4 w-4" />
            Back to Website
          </Link>
        </Button>
        <Button asChild>
          <Link href="/settings">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Settings
          </Link>
       </Button>
      </div>
    </div>
  );
}
