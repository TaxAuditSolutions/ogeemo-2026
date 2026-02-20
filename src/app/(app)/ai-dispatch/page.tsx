
'use client';

import React, { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
    ArrowLeft, 
    BrainCircuit, 
    Cpu, 
    Zap,
    Mic,
    Square,
    Search,
    Info,
    ArrowRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { processCommand } from '@/lib/command-processor';
import { useSpeechToText } from '@/hooks/use-speech-to-text';

export default function AiDispatchPage() {
  const [commandInput, setCommandInput] = useState('');
  const { toast } = useToast();
  const router = useRouter();
  
  const launcherInputRef = useRef<HTMLInputElement>(null);
  const launcherBaseTextRef = useRef('');

  const launcherSpeech = useSpeechToText({
    onTranscript: (transcript) => {
      const newText = launcherBaseTextRef.current ? `${launcherBaseTextRef.current} ${transcript}` : transcript;
      setCommandInput(newText);
    },
  });

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

  const handleApplyHint = (hint: string) => {
      setCommandInput(hint);
      launcherInputRef.current?.focus();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 flex flex-col h-full items-center bg-muted/10">
      <header className="relative text-center w-full max-w-2xl">
        <div className="absolute left-0 top-1/2 -translate-y-1/2">
            <Button asChild variant="outline" size="sm">
                <Link href="/action-manager"><ArrowLeft className="mr-2 h-4 w-4" /> Exit</Link>
            </Button>
        </div>
        <div className="flex items-center justify-center gap-3">
            <h1 className="text-4xl font-bold font-headline text-primary tracking-tight">Ogeemo AI Dispatch</h1>
            <Button asChild variant="ghost" size="icon" className="h-10 w-10 text-primary hover:text-primary/80" title="Open Global Search">
                <Link href="/reports/search">
                    <Search className="h-8 w-8" />
                    <span className="sr-only">Open Global Search</span>
                </Link>
            </Button>
        </div>
        <p className="text-muted-foreground">Unified terminal for operational orchestration.</p>
      </header>

      <div className="max-w-2xl w-full space-y-6">
        <Card className={cn("border-2 transition-all duration-300 shadow-xl", commandResult.type !== 'unknown' ? "border-primary" : "border-muted")}>
            <CardHeader className="bg-muted/30 pb-4">
              <div className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Enter Command Prompt</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="relative">
                  <Input
                    ref={launcherInputRef}
                    placeholder={launcherSpeech.isListening ? "Listening for intent..." : "Describe where you want to go or what you want to do..."}
                    value={commandInput}
                    onChange={(e) => setCommandInput(e.target.value)}
                    className={cn("h-16 text-xl pr-24 rounded-xl shadow-inner", launcherSpeech.isListening && "ring-2 ring-destructive")}
                    onKeyDown={(e) => e.key === 'Enter' && handleExecuteCommand()}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <Button variant="ghost" size="icon" className={cn("h-10 w-10 rounded-full", launcherSpeech.isListening && "bg-destructive text-white")} onClick={handleMicClick}>
                        {launcherSpeech.isListening ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                      </Button>
                      <Zap className={cn("h-6 w-6 transition-colors", commandResult.type !== 'unknown' ? "text-primary" : "text-muted-foreground/20")} />
                  </div>
              </div>

              <div className="min-h-[160px] flex items-center justify-center border-2 border-dashed rounded-xl p-8 bg-primary/5">
                  {commandInput ? (
                      <div className="w-full space-y-4 animate-in fade-in zoom-in-95 duration-200">
                          <div className="flex items-center justify-between">
                              <h4 className="text-2xl font-bold text-primary">{commandResult.message}</h4>
                              <Badge variant="outline" className="border-primary text-primary">{commandResult.category}</Badge>
                          </div>
                          <p className="text-muted-foreground text-sm">{commandResult.description}</p>
                          {commandResult.type !== 'unknown' && (
                              <Button className="w-full h-12 text-lg font-bold shadow-lg" onClick={handleExecuteCommand}>Execute Dispatch</Button>
                          )}
                      </div>
                  ) : (
                      <div className="text-center opacity-40">
                          <BrainCircuit className="h-12 w-12 mx-auto mb-4 text-primary" />
                          <p className="text-sm font-bold uppercase tracking-widest">Awaiting Logic Signal...</p>
                          <p className="text-xs text-muted-foreground mt-1 italic">Type "Go to Invoices" or "New Contact" to begin.</p>
                      </div>
                  )}
              </div>
            </CardContent>
            <CardFooter className="bg-muted/10 text-[10px] uppercase tracking-widest text-muted-foreground justify-center py-2">
                Operational Intelligence Mode: Active
            </CardFooter>
        </Card>

        {/* Command Hints Section */}
        <div className="space-y-3 px-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Info className="h-3.5 w-3.5" />
                Orchestration Hints
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                    { label: "Check Ledger", cmd: "Go to Ledger" },
                    { label: "Run Payroll", cmd: "Open Payroll" },
                    { label: "New Project", cmd: "Create a Project" },
                    { label: "Find Contact", cmd: "Search for Smith" }
                ].map(hint => (
                    <Button 
                        key={hint.cmd} 
                        variant="ghost" 
                        className="justify-between h-9 bg-white border px-3 hover:bg-primary/5 group"
                        onClick={() => handleApplyHint(hint.cmd)}
                    >
                        <span className="text-xs font-medium">{hint.label}</span>
                        <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                    </Button>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}
