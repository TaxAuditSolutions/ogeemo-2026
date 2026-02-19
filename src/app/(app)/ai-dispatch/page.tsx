
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    ArrowLeft, 
    BrainCircuit, 
    LoaderCircle, 
    Terminal, 
    ArrowRight,
    Search,
    Zap,
    Mic,
    Square,
    Database,
    AlertTriangle,
    RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { processCommand } from '@/lib/command-processor';
import { useSpeechToText } from '@/hooks/use-speech-to-text';
import { getContacts } from '@/services/contact-service';
import { getProjects, getTasksForUser } from '@/services/project-service';
import { getInvoices, getIncomeTransactions, getExpenseTransactions } from '@/services/accounting-service';
import { getFiles } from '@/services/file-service';

export default function AiDispatchPage() {
  const [commandInput, setCommandInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchableData, setSearchableData] = useState<any[]>([]);

  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  
  const launcherInputRef = useRef<HTMLInputElement>(null);
  const launcherBaseTextRef = useRef('');

  const launcherSpeech = useSpeechToText({
    onTranscript: (transcript) => {
      const newText = launcherBaseTextRef.current ? `${launcherBaseTextRef.current} ${transcript}` : transcript;
      setCommandInput(newText);
    },
  });

  const loadSearchData = useCallback(async () => {
    if (!user) return;
    setIsDataLoading(true);
    setLoadError(null);
    try {
        const [
            contacts, projects, invoices, income, expenses, tasks, files
        ] = await Promise.all([
            getContacts(user.uid).catch(() => []),
            getProjects(user.uid).catch(() => []),
            getInvoices(user.uid).catch(() => []),
            getIncomeTransactions(user.uid).catch(() => []),
            getExpenseTransactions(user.uid).catch(() => []),
            getTasksForUser(user.uid).catch(() => []),
            getFiles(user.uid).catch(() => []),
        ]);

        const combined = [
            ...contacts.map(i => ({ ...i, type: 'Contact' })),
            ...projects.map(i => ({ ...i, type: 'Project' })),
            ...invoices.map(i => ({ ...i, type: 'Invoice' })),
            ...income.map(i => ({ ...i, type: 'Income' })),
            ...expenses.map(i => ({ ...i, type: 'Expense' })),
            ...tasks.map(i => ({ ...i, type: 'Task' })),
            ...files.map(i => ({ ...i, type: 'File' })),
        ];
        setSearchableData(combined);
    } catch (error: any) {
        console.error("Index Error:", error);
        setLoadError("Failed to build dispatch index. Some search features may be limited.");
    } finally {
        setIsDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSearchData();
  }, [loadSearchData]);

  const commandResult = useMemo(() => processCommand(commandInput), [commandInput]);

  const handleMicClick = () => {
    if (launcherSpeech.isListening) {
        launcherSpeech.stopListening();
    } else {
        launcherBaseTextRef.current = commandInput.trim();
        launcherSpeech.startListening();
        launcherInputRef.current?.focus();
    }
  };

  const handleExecuteCommand = () => {
    if (commandResult.type === 'unknown') {
        toast({ variant: 'destructive', title: "Signal Not Recognized" });
        return;
    }
    if (commandResult.target) {
        if (commandResult.isExternal) window.open(commandResult.target, '_blank');
        else router.push(commandResult.target);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 flex flex-col h-full items-center">
      <header className="relative text-center w-full max-w-4xl">
        <div className="absolute left-0 top-1/2 -translate-y-1/2">
            <Button asChild variant="outline" size="sm">
                <Link href="/action-manager"><ArrowLeft className="mr-2 h-4 w-4" /> Exit</Link>
            </Button>
        </div>
        <h1 className="text-4xl font-bold font-headline text-primary tracking-tight">Ogeemo AI Dispatch</h1>
        <p className="text-muted-foreground">Unified terminal for navigation and intelligence.</p>
      </header>

      <div className="max-w-4xl w-full space-y-6">
        {loadError && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">{loadError}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={loadSearchData} className="h-7"><RefreshCw className="h-3 w-3 mr-1" /> Retry</Button>
            </div>
        )}

        <Card className={cn("border-2 transition-all duration-300", commandResult.type !== 'unknown' ? "border-primary shadow-lg" : "border-muted")}>
            <CardHeader className="bg-muted/30 pb-4">
              <div className="flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Command Terminal</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="relative">
                  <Input
                    ref={launcherInputRef}
                    placeholder={launcherSpeech.isListening ? "Listening for intent..." : "Describe where you want to go or what to create..."}
                    value={commandInput}
                    onChange={(e) => setCommandInput(e.target.value)}
                    className={cn("h-16 text-xl pr-24 rounded-xl", launcherSpeech.isListening && "ring-2 ring-destructive")}
                    onKeyDown={(e) => e.key === 'Enter' && handleExecuteCommand()}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <Button variant="ghost" size="icon" className={cn("h-10 w-10 rounded-full", launcherSpeech.isListening && "bg-destructive text-white")} onClick={handleMicClick}>
                        {launcherSpeech.isListening ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                      </Button>
                      <Zap className={cn("h-6 w-6", commandResult.type !== 'unknown' ? "text-primary" : "text-muted-foreground/20")} />
                  </div>
              </div>

              <div className="min-h-[100px] flex items-center justify-center border-2 border-dashed rounded-xl p-6 bg-muted/5">
                  {commandInput ? (
                      <div className="w-full space-y-4">
                          <h4 className="text-2xl font-bold">{commandResult.message}</h4>
                          <p className="text-muted-foreground">{commandResult.description}</p>
                          {commandResult.type !== 'unknown' && (
                              <Button className="w-full h-12 text-lg font-bold" onClick={handleExecuteCommand}>Execute Dispatch</Button>
                          )}
                      </div>
                  ) : (
                      <div className="text-center opacity-40">
                          <BrainCircuit className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-sm font-medium">Awaiting Logic Signal...</p>
                      </div>
                  )}
              </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
    