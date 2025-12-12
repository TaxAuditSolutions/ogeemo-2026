

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Calculator,
  LoaderCircle,
  Plus,
  Settings,
} from 'lucide-react';
import { getActionChips, type ActionChipData } from '@/services/project-service';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  cta: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, description, href, cta }) => (
  <Card className="flex flex-col">
    <CardHeader>
      <div className="flex items-start gap-4">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="mt-1">{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="flex-1" />
    <CardFooter>
      <Button asChild className="w-full">
        <Link href={href}>
          {cta}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </CardFooter>
  </Card>
);

export function AccountingToolsView() {
  const [quickNavItems, setQuickNavItems] = useState<ActionChipData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadItems = useCallback(async () => {
    if (user) {
      setIsLoading(true);
      try {
        const items = await getActionChips(user.uid, 'accountingQuickNavItems');
        setQuickNavItems(items);
      } catch (error) {
        console.error("Failed to load quick nav items:", error);
        toast({ variant: 'destructive', title: 'Failed to load navigation', description: error instanceof Error ? error.message : 'An unknown error occurred.'});
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadItems();
    window.addEventListener('accountingChipsUpdated', loadItems);
    return () => window.removeEventListener('accountingChipsUpdated', loadItems);
  }, [loadItems]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <header className="text-center mb-6">
        <div className="flex justify-center items-center gap-4 mb-2">
            <Calculator className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold font-headline text-primary">
              Accounting Hub
            </h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Your central command for managing finances. Below are your quick-access links.
        </p>
         <div className="mt-4">
            <Button asChild>
                <Link href="/accounting/manage-navigation">
                  <Settings className="mr-2 h-4 w-4"/>
                  Manage Quick Navigation
                </Link>
            </Button>
        </div>
      </header>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-48">
            <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : quickNavItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {quickNavItems.map((item) => (
            <FeatureCard 
              key={item.id}
              icon={item.icon}
              title={item.label}
              description={`Manage ${item.label.toLowerCase()}.`}
              href={typeof item.href === 'string' ? item.href : item.href.pathname || '#'}
              cta={item.label === 'Matchbook Loan Summary' ? 'Go to Summary' : `Go to ${item.label}`}
            />
          ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-lg max-w-3xl mx-auto">
          <p className="font-semibold">Your Quick Navigation is empty.</p>
          <p className="text-sm">Add some shortcuts to get started.</p>
          <Button variant="link" asChild className="mt-2">
             <Link href="/accounting/manage-navigation">
               <Plus className="mr-2 h-4 w-4" />
               Add a shortcut
             </Link>
          </Button>
      </div>
      )}
    </div>
  );
}
