'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoaderCircle, Settings, Plus, PlayCircle, BookOpen, Info, X, ArrowRight } from 'lucide-react';
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { cn } from '@/lib/utils';

export default function ActionManagerDashboardPage() {
  const [chips, setChips] = useState<ActionChipData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const { preferences, updatePreferences } = useUserPreferences();
  const [isAboutPanelVisible, setIsAboutPanelVisible] = useState(false);

  useEffect(() => {
    if (preferences) {
      setIsAboutPanelVisible(preferences.showActionManagerAboutPanel ?? true);
    }
  }, [preferences]);

  const handleDismissAboutPanel = () => {
    setIsAboutPanelVisible(false);
    updatePreferences({ showActionManagerAboutPanel: false });
  };
  
  const toggleAboutPanel = () => {
      const newVisibility = !isAboutPanelVisible;
      setIsAboutPanelVisible(newVisibility);
      updatePreferences({ showActionManagerAboutPanel: newVisibility });
  };

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
          title: 'Failed to load actions',
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
          <h1 className="text-3xl font-bold font-headline text-primary">
            Action Manager
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Your quick-access command center. Click an action to get started.
          </p>
        </header>

        <div
            className={cn(
                "w-full max-w-4xl transition-all duration-300 overflow-hidden",
                isAboutPanelVisible ? "max-h-[500px] opacity-100 mb-6" : "max-h-0 opacity-0 mb-0"
            )}
        >
            <Alert className="bg-primary/5 border-primary/20">
                <Info className="h-4 w-4 text-primary" />
                <div className="flex justify-between items-start w-full">
                    <div className="flex-1 pr-4">
                        <AlertTitle className="font-bold text-primary">About the Action Manager</AlertTitle>
                        <AlertDescription className="mt-2 space-y-4 text-foreground/80">
                            <p>This is your personalized dashboard. Add, remove, and reorder 'Action Chips' to create one-click shortcuts to the Ogeemo managers and tools you use most often.</p>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-3 border-t border-primary/10">
                                <p className="text-xs font-bold uppercase tracking-widest text-primary/70">Master the Spider Web orchestration:</p>
                                <Button asChild variant="outline" size="sm" className="h-8 px-4 text-xs bg-background border-primary/30 hover:bg-primary/5 hover:text-primary transition-all">
                                    <Link href="/action-chips-info">
                                        Action Chip Magic <ArrowRight className="ml-2 h-3.5 w-3.5" />
                                    </Link>
                                </Button>
                            </div>
                        </AlertDescription>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 -mr-2 -mt-2 opacity-50 hover:opacity-100" onClick={handleDismissAboutPanel}>
                        <X className="h-4 w-4" />
                        <span className="sr-only">Dismiss</span>
                    </Button>
                </div>
            </Alert>
        </div>

        <Card className="w-full max-w-4xl shadow-md border-black/5">
            <CardHeader className="flex-row items-center justify-center p-4 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button asChild className="h-9 bg-slate-900 text-white hover:bg-slate-800">
                              <Link href="/master-mind">
                                  <PlayCircle className="mr-2 h-4 w-4 text-primary" />
                                  Command Centre
                              </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Go to your primary execution hub (Master Mind)</p>
                        </TooltipContent>
                      </Tooltip>
                       <Tooltip>
                        <TooltipTrigger asChild>
                           <Button asChild variant="outline" className="h-9">
                                <Link href="/master-mind/gtd-instructions">
                                    <BookOpen className="mr-2 h-4 w-4" />
                                    TOM
                                </Link>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>The Ogeemo Method of managing your day</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" onClick={toggleAboutPanel} className="h-9">
                                <Info className="mr-2 h-4 w-4" />
                                About
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Show/Hide info panel</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                            <Button asChild variant="outline" className="h-9">
                                <Link href="/action-manager/manage">
                                    <Settings className="mr-2 h-4 w-4" />
                                    Manage Actions
                                </Link>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Customize your dashboard chips.</p>
                        </TooltipContent>
                      </Tooltip>
                </TooltipProvider>
                </div>
            </CardHeader>
            <CardContent className="min-h-[240px] p-6">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-4">
                        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Syncing nodes...</p>
                    </div>
                ) : chips.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {chips.map((chip, index) => (
                           <ActionChip key={chip.id} chip={chip} index={index} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-lg bg-muted/20">
                        <p className="font-semibold mb-2">Your spider web is empty.</p>
                        <p className="text-xs mb-6">Orchestrate your dashboard by adding some shortcuts.</p>
                        <Button asChild>
                           <Link href="/action-manager/manage">
                             <Plus className="mr-2 h-4 w-4" />
                             Manage My Action Chips
                           </Link>
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
