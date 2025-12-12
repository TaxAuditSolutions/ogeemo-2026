
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoaderCircle, Settings, Plus, PlayCircle, BookOpen, Lightbulb, Info, X } from 'lucide-react';
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
import { AnimatePresence, motion } from 'framer-motion';

export default function ActionManagerDashboardPage() {
  const [chips, setChips] = useState<ActionChipData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const { preferences, updatePreferences } = useUserPreferences();
  const [isAboutPanelVisible, setIsAboutPanelVisible] = useState(false);

  useEffect(() => {
    // Only set the initial visibility from preferences once they are loaded
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
    
    // Listen for custom event to reload chips if they are changed on another page
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

        <AnimatePresence>
            {isAboutPanelVisible && (
                 <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="w-full max-w-4xl mb-6 overflow-hidden"
                >
                    <Alert>
                        <Info className="h-4 w-4" />
                        <div className="flex justify-between items-start">
                            <div>
                                <AlertTitle>About the Action Manager</AlertTitle>
                                <AlertDescription>
                                This is your personalized dashboard. Add, remove, and reorder 'Action Chips' to create one-click shortcuts to the Ogeemo managers and tools you use most often.
                                </AlertDescription>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7 -mr-2 -mt-2" onClick={handleDismissAboutPanel}>
                                <X className="h-4 w-4" />
                                <span className="sr-only">Dismiss</span>
                            </Button>
                        </div>
                    </Alert>
                </motion.div>
            )}
        </AnimatePresence>

        <Card className="w-full max-w-4xl">
            <CardHeader className="flex-row items-center justify-center p-4">
                <div className="flex items-center gap-2">
                    <TooltipProvider delayDuration={0}>
                       <Tooltip>
                        <TooltipTrigger asChild>
                           <Button asChild className="h-9">
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
                            <Button onClick={toggleAboutPanel} className="h-9">
                                <Info className="mr-2 h-4 w-4" />
                                About
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>About the Action Manager</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                            <Button asChild className="h-9">
                                <Link href="/action-manager/manage">
                                    <Settings className="mr-2 h-4 w-4" />
                                    Manage Dashboard
                                </Link>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Manage your actions with action chips.</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                            <Button asChild className="h-9">
                                <Link href="/idea-board">
                                    <Lightbulb className="mr-2 h-4 w-4" />
                                    Ideas
                                </Link>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Save your thoughts and ideas</p>
                        </TooltipContent>
                      </Tooltip>
                </TooltipProvider>
                </div>
            </CardHeader>
            <CardContent className="min-h-[200px]">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <LoaderCircle className="h-8 w-8 animate-spin" />
                    </div>
                ) : chips.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {chips.map((chip, index) => (
                           <ActionChip key={chip.id} chip={chip} index={index} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-lg">
                        <p>No actions found.</p>
                        <Button variant="link" asChild>
                           <Link href="/action-manager/manage">
                             <Plus className="mr-2 h-4 w-4" />
                             Add an action to your dashboard
                           </Link>
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}

    