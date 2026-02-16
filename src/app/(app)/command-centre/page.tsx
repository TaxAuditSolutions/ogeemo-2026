'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
    Card, 
    CardContent, 
    CardDescription, 
    CardHeader, 
    CardTitle, 
    CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
    ArrowLeft, 
    Bot, 
    Send, 
    BrainCircuit, 
    HelpCircle, 
    Info, 
    LoaderCircle, 
    User, 
    X, 
    RefreshCw, 
    Terminal, 
    ArrowRight,
    Search,
    History,
    Zap,
    Cpu,
    Construction,
    Wand2,
    Compass
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { processCommand, type CommandResult } from '@/lib/command-processor';

const RECENT_COMMANDS_KEY = 'ogeemoRecentCommandsV2';

const discoverableIntents = [
    { label: "Go to Ledger", cmd: "Go to ledger" },
    { label: "New Project", cmd: "New project" },
    { label: "New Contact", cmd: "New contact" },
    { label: "Track Meeting", cmd: "Track meeting" },
    { label: "Open CRM", cmd: "CRM" },
    { label: "View Payroll", cmd: "Payroll" },
];

export default function OgeemoAiPage() {
  const [commandInput, setCommandInput] = useState('');
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();

  // Load recent commands
  useEffect(() => {
    const saved = localStorage.getItem(RECENT_COMMANDS_KEY);
    if (saved) setRecentCommands(JSON.parse(saved));
  }, []);

  // Real-time Command Processing
  const commandResult = useMemo(() => {
    return processCommand(commandInput);
  }, [commandInput]);

  const saveCommandToHistory = (cmd: string) => {
      const updated = [cmd, ...recentCommands.filter(c => c !== cmd)].slice(0, 5);
      setRecentCommands(updated);
      localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(updated));
  };

  const handleExecuteCommand = () => {
    if (!commandResult || commandResult.type === 'unknown') {
        toast({ variant: 'destructive', title: "Command not recognized", description: "Try one of the suggested keywords below." });
        return;
    }
    
    saveCommandToHistory(commandInput);
    
    if (commandResult.target) {
        if (commandResult.isExternal) {
            window.open(commandResult.target, '_blank');
        } else {
            router.push(commandResult.target);
        }
        toast({ title: "Executing Command", description: commandResult.message });
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 flex flex-col h-full items-center">
      {/* System Status Bar */}
      <div className="w-full max-w-5xl flex items-center justify-between px-4 py-2 bg-muted/50 border rounded-lg text-xs">
          <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-primary" />
                  <span className="font-semibold">Operator:</span>
                  <span className="text-muted-foreground">{user?.displayName || user?.email}</span>
              </div>
              <div className="flex items-center gap-2 border-l pl-4">
                  <Cpu className="h-3.5 w-3.5 text-amber-500" />
                  <span className="font-semibold">System State:</span>
                  <span className={cn(
                      "font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 rounded",
                      commandResult.type === 'unknown' ? "text-muted-foreground bg-muted" : "text-green-600 bg-green-500/10"
                  )}>
                      {commandResult.type === 'unknown' ? "Listening" : "Locked"}
                  </span>
              </div>
          </div>
          <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-tighter font-bold text-muted-foreground">Ogeemo Deterministic OS v2.0</span>
          </div>
      </div>

      <header className="relative text-center w-full max-w-5xl pt-4">
        <div className="absolute left-0 top-1/2 -translate-y-1/2">
            <Button asChild variant="outline" size="sm">
                <Link href="/action-manager">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Exit
                </Link>
            </Button>
        </div>
        <h1 className="text-4xl font-bold font-headline text-primary tracking-tight">Command Centre</h1>
        <p className="text-muted-foreground mt-1">Zero-latency navigation terminal. Speak or type your intent.</p>
      </header>

      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* Main Launcher Section */}
        <div className="lg:col-span-7 space-y-6 flex flex-col">
          <Card className={cn(
              "border-2 transition-all duration-300 shadow-xl overflow-hidden",
              commandResult.type !== 'unknown' ? "border-primary shadow-primary/10" : "border-primary/20"
          )}>
            <CardHeader className="bg-primary/5 border-b pb-4">
              <div className="flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Command Terminal</CardTitle>
              </div>
              <CardDescription>Enter a hub name, a page keyword, or a complex action.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="relative group">
                  <Input
                    placeholder="e.g., 'Accounting', 'New contact Dan', 'Go to Ledger'..."
                    value={commandInput}
                    onChange={(e) => setCommandInput(e.target.value)}
                    className="h-16 text-xl pr-14 focus-visible:ring-primary border-primary/30 rounded-xl"
                    onKeyDown={(e) => e.key === 'Enter' && handleExecuteCommand()}
                    autoFocus
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <Zap className={cn(
                          "h-6 w-6 transition-colors duration-300",
                          commandResult.type !== 'unknown' ? "text-primary animate-pulse" : "text-muted-foreground/30"
                      )} />
                  </div>
              </div>

              {/* Real-time Intent Preview */}
              <div className="min-h-[120px] flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 transition-colors bg-muted/5">
                  {commandInput.trim() === '' ? (
                      <div className="text-center space-y-3 opacity-40">
                          <BrainCircuit className="h-10 w-10 mx-auto" />
                          <p className="text-sm font-medium">Awaiting input signal...</p>
                      </div>
                  ) : (
                      <div className="w-full space-y-4 animate-in fade-in zoom-in-95 duration-200">
                          <div className="flex items-start gap-4">
                              <div className={cn(
                                  "p-3 rounded-full shrink-0",
                                  commandResult.type === 'unknown' ? "bg-muted" : "bg-primary/10"
                              )}>
                                  {commandResult.type === 'unknown' ? <HelpCircle className="h-6 w-6 text-muted-foreground" /> : <Wand2 className="h-6 w-6 text-primary" />}
                              </div>
                              <div className="flex-1">
                                  <h4 className="text-2xl font-bold text-foreground leading-tight">{commandResult.message}</h4>
                                  <p className="text-muted-foreground text-sm mt-1">{commandResult.description}</p>
                              </div>
                          </div>
                          {commandResult.type !== 'unknown' && (
                              <Button className="w-full h-12 text-lg font-bold group shadow-lg" onClick={handleExecuteCommand}>
                                  Execute Launch <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                              </Button>
                          )}
                      </div>
                  )}
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t py-3 flex justify-between items-center px-6">
                <div className="flex items-center gap-2">
                    <History className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Recents</span>
                </div>
                <div className="flex gap-2">
                    {recentCommands.length > 0 ? recentCommands.map((cmd, i) => (
                        <Button key={i} variant="ghost" className="h-7 px-3 text-[10px] border bg-background hover:bg-muted" onClick={() => setCommandInput(cmd)}>{cmd}</Button>
                    )) : <span className="text-[10px] text-muted-foreground italic">Terminal history clear</span>}
                </div>
            </CardFooter>
          </Card>

          {/* Discovery Section */}
          <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                  <Compass className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Discoverable Intents</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {discoverableIntents.map((intent) => (
                      <Card 
                        key={intent.label} 
                        className="cursor-pointer hover:border-primary/50 transition-colors group"
                        onClick={() => setCommandInput(intent.cmd)}
                      >
                          <CardContent className="p-3 flex items-center justify-between">
                              <span className="text-xs font-semibold">{intent.label}</span>
                              <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </CardContent>
                      </Card>
                  ))}
              </div>
          </div>
        </div>

        {/* AI Assistant Section (Under Development) */}
        <div className="lg:col-span-5 flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col min-h-0 border-dashed bg-muted/10">
            <CardHeader className="border-b bg-muted/20 py-3 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm">Ask a Question</CardTitle>
                </div>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">BETA</Badge>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-0 flex flex-col items-center justify-center text-center">
                <div className="p-8 max-w-sm space-y-4">
                    <div className="relative mx-auto w-fit">
                        <div className="absolute -inset-4 bg-amber-500/10 rounded-full animate-ping opacity-20" />
                        <Construction className="h-16 w-16 text-amber-500 relative z-10" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold">Feature Under Development</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            The Ogeemo AI Brain is currently undergoing high-level contextual training to provide more precise answers regarding your data.
                        </p>
                    </div>
                    <Alert className="bg-background/50 border-amber-200 py-3">
                        <Info className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                            This section will be fully enabled in Ogeemo v2.1.
                        </AlertDescription>
                    </Alert>
                </div>
            </CardContent>
            <CardFooter className="border-t p-3 bg-muted/20">
                <form className="flex w-full gap-2 opacity-50 pointer-events-none">
                    <Input
                        placeholder="Currently unavailable..."
                        disabled
                        className="h-10 text-xs"
                    />
                    <Button type="button" size="icon" className="h-10 w-10 shrink-0" disabled>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
