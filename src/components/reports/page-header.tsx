
'use client';

import Link from 'next/link';
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronDown, LoaderCircle } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/auth-context';
import { getActionChips, type ActionChipData } from '@/services/project-service';

interface ReportsPageHeaderProps {
  pageTitle: string;
  hubPath?: string;
  hubLabel?: string;
  onTestClick?: () => void;
}

export function ReportsPageHeader({ 
    pageTitle, 
    hubPath = "/reports", 
    hubLabel = "Reports Hub",
    onTestClick
}: ReportsPageHeaderProps) {
  const [navItems, setNavItems] = useState<ActionChipData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  
  const loadNavItems = useCallback(async () => {
    if (user) {
      setIsLoading(true);
      try {
        const items = await getActionChips(user.uid, 'accountingQuickNavItems');
        setNavItems(items);
      } catch (error) {
        console.error("Failed to load quick nav items:", error);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadNavItems();
    window.addEventListener('accountingChipsUpdated', loadNavItems);
    return () => window.removeEventListener('accountingChipsUpdated', loadNavItems);
  }, [loadNavItems]);

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
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline">
                    Quick Navigation 
                    {isLoading ? <LoaderCircle className="ml-2 h-4 w-4 animate-spin" /> : <ChevronDown className="ml-2 h-4 w-4" />}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <ScrollArea className="h-[400px]">
                {navItems.map(item => (
                  <DropdownMenuItem key={item.id} asChild>
                    <Link href={typeof item.href === 'string' ? item.href : (item.href?.pathname || '#')}>
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </ScrollArea>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/accounting/manage-navigation">Manage Quick Nav</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        {onTestClick && <Button variant="outline" onClick={onTestClick}>Test</Button>}
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
