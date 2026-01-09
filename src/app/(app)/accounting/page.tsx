
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Calculator,
  Settings,
  Info,
  LoaderCircle,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { getActionChips, type ActionChipData } from '@/services/project-service';
import { useToast } from '@/hooks/use-toast';
import { ActionChip } from '@/components/dashboard/ActionChip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function AccountingHubPage() {
  const [navItems, setNavItems] = useState<ActionChipData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadNavItems = useCallback(async () => {
    if (user) {
      setIsLoading(true);
      try {
        const items = await getActionChips(user.uid, 'accountingQuickNavItems');
        setNavItems(items);
      } catch (error) {
        console.error("Failed to load accounting quick nav items:", error);
        toast({
          variant: 'destructive',
          title: 'Error Loading Actions',
          description: 'Could not load your quick navigation actions.',
        });
      } finally {
        setIsLoading(false);
      }
    } else {
        setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadNavItems();
    window.addEventListener('accountingChipsUpdated', loadNavItems);
    return () => window.removeEventListener('accountingChipsUpdated', loadNavItems);
  }, [loadNavItems]);

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6">
        <header className="text-center mb-6">
          <div className="flex justify-center items-center gap-2 mb-2">
            <Calculator className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold font-headline text-primary">
              Accounting Hub
            </h1>
            <Button variant="ghost" size="icon" onClick={() => setIsInfoOpen(true)}>
              <Info className="h-5 w-5 text-muted-foreground" />
              <span className="sr-only">About the Accounting Hub</span>
            </Button>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Your central command for managing finances. Click an action to get started, or customize your dashboard by managing your quick navigation items.
          </p>
          <div className="mt-4">
            <Button asChild variant="outline">
              <Link href="/accounting/manage-navigation">
                <Settings className="mr-2 h-4 w-4"/>
                Manage Quick Navigation
              </Link>
            </Button>
          </div>
        </header>
        
        <Card className="max-w-6xl mx-auto">
            <CardHeader>
                <CardTitle>Your Quick Navigation Actions</CardTitle>
                <CardDescription>This is your personalized dashboard of accounting tools.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex h-48 w-full items-center justify-center">
                        <LoaderCircle className="h-8 w-8 animate-spin" />
                    </div>
                ) : navItems.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {navItems.map((chip, index) => (
                           <ActionChip key={chip.id} chip={chip} index={index} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground p-8">
                        No actions found.
                    </div>
                )}
            </CardContent>
        </Card>
      </div>

      <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>About the Accounting Hub</DialogTitle>
                  <DialogDescription>
                      This is your main center for all financial activities.
                  </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                  <p className="text-sm text-muted-foreground">
                      This dashboard displays your "Quick Navigation" items. You can add, remove, and reorder these shortcuts by clicking the "Manage Quick Navigation" button. This allows you to tailor the hub to show the tools you use most frequently.
                  </p>
              </div>
              <DialogFooter>
                  <Button onClick={() => setIsInfoOpen(false)}>Close</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </>
  );
}
