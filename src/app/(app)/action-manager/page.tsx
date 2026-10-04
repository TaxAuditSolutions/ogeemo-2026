'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoaderCircle, Settings, Plus, BookOpen } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getActionChips, type ActionChipData } from '@/services/project-service';
import { ActionChip } from '@/components/dashboard/ActionChip';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpTip } from '@/components/ui/help-tip';

export default function ActionManagerDashboardPage() {
  const [chips, setChips] = useState<ActionChipData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  // The About panel was removed: teaching lives in Learn Ogeemo now, with a
  // contextual ? in the page header (docs/help-standard.md).

  const loadChips = useCallback(async () => {
    if (user) {
      setIsLoading(true);
      try {
        const userChips = await getActionChips(user.uid);
        setChips(userChips);
      } catch (error) {
        console.error("Failed to load chips:", error);
        toast({
          variant: 'destructive',
          title: 'Failed to load shortcuts',
          description: error instanceof Error ? error.message : 'An unknown error occurred.',
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadChips();
    const handleChipsUpdate = () => loadChips();
    window.addEventListener('chipsUpdated', handleChipsUpdate);
    return () => window.removeEventListener('chipsUpdated', handleChipsUpdate);
  }, [loadChips]);


  return (
    <div className="p-4 sm:p-6 flex flex-col items-center h-full">
        <header className="text-center mb-6">
          <div className="flex items-center justify-center gap-1">
            <h1 className="text-3xl font-bold font-headline text-primary">
              My Shortcuts
            </h1>
            <HelpTip
              title="My Shortcuts"
              learnHref="/learn?topic=action-manager"
              learnLabel="Learn about My Shortcuts"
            >
              Your personal dashboard of one-click shortcuts. Add, remove, and reorder them to match how you work.
            </HelpTip>
          </div>
        </header>

        <Card className="w-full max-w-4xl shadow-md border-black/5">
            <CardHeader className="flex-row items-center justify-center p-4 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                    {/* Default 700ms delay: delayDuration={0} made these pop
                        instantly on every pass, which felt intrusive in beta. */}
                    <TooltipProvider>
                       <Tooltip>
                        <TooltipTrigger asChild>
                           <Button asChild variant="outline" className="h-9">
                                <Link href="/learn/guides/gtd">
                                    <BookOpen className="mr-2 h-4 w-4" />
                                    TOM
                                </Link>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>The Ogeemo Method of managing your day</p>
                        </TooltipContent>
                      </Tooltip>
                      {/* Label already says it: a tip that restates
                          "Manage Shortcuts" was pure noise in beta. */}
                      <Button asChild variant="outline" className="h-9">
                          <Link href="/action-manager/manage">
                              <Settings className="mr-2 h-4 w-4" />
                              Manage Shortcuts
                          </Link>
                      </Button>
                </TooltipProvider>
                </div>
            </CardHeader>
            <CardContent className="min-h-[240px] p-6">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-4">
                        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Loading your shortcuts...</p>
                    </div>
                ) : chips.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {chips.map((chip, index) => (
                           <ActionChip key={chip.id} chip={chip} index={index} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-lg bg-muted/20">
                        <p className="font-semibold mb-2">No shortcuts yet.</p>
                        <p className="text-xs mb-6">Set up your dashboard by adding shortcuts.</p>
                        <Button asChild>
                           <Link href="/action-manager/manage">
                             <Plus className="mr-2 h-4 w-4" />
                             Manage My Shortcuts
                           </Link>
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
