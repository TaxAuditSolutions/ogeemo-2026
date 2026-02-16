'use client';

import React, { useState, useRef, useEffect } from 'react';
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
    Play, 
    ArrowRight,
    Search,
    History,
    Zap,
    Cpu
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { processCommand, type CommandResult } from '@/lib/command-processor';
import { ogeemoAgent } from '@/ai/flows/ogeemo-chat';

const RECENT_COMMANDS_KEY = 'ogeemoRecentCommands';

export default function OgeemoAiPage() {
  const [commandInput, setCommandInput] = useState('');
  const [questionInput, setQuestionInput] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [commandResult, setCommandResult] = useState<CommandResult | null>(null);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load recent commands
  useEffect(() => {
    const saved = localStorage.getItem(RECENT_COMMANDS_KEY);
    if (saved) setRecentCommands(JSON.parse(saved));
  }, []);

  // Sync scroll
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [chatMessages, isAiLoading]);

  // Command Processing (Deterministic)
  useEffect(() => {
    if (commandInput.trim()) {
        const result = processCommand(commandInput);
        setCommandResult(result);
    } else {
        setCommandResult(null);
    }
  }, [commandInput]);

  const saveCommandToHistory = (cmd: string) => {
      const updated = [cmd, ...recentCommands.filter(c => c !== cmd)].slice(0, 5);
      setRecentCommands(updated);
      localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(updated));
  };

  const handleExecuteCommand = () => {
    if (!commandResult || commandResult.type === 'unknown') return;
    
    saveCommandToHistory(commandInput);
    
    if (commandResult.target) {
        if (commandResult.isExternal) {
            window.open(commandResult.target, '_blank');
        } else {
            router.push(commandResult.target);
        }
        toast({ title: commandResult.message });
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionInput.trim() || isAiLoading || !user) return;

    const text = questionInput.trim();
    const userMsg = { id: Date.now(), text, sender: 'user' };
    setChatMessages(prev => [...prev, userMsg]);
    setQuestionInput('');
    setIsAiLoading(true);

    try {
        const result = await ogeemoAgent({
            message: text,
            clientUserId: user.uid
        });
        const ogeemoMsg = { id: Date.now() + 1, text: result.reply, sender: 'ogeemo' };
        setChatMessages(prev => [...prev, ogeemoMsg]);
    } catch (error: any) {
        console.error("[Ogeemo Agent Error]", error);
        toast({ 
            variant: 'destructive', 
            title: "Assistant Error", 
            description: error.message || "AI service encountered an error. Please try again." 
        });
    } finally {
        setIsAiLoading(false);
    }
  };

  const handleClearHistory = () => {
      setChatMessages([]);
      toast({ title: "Conversation Cleared" });
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 flex flex-col h-full items-center">
      {/* Context Bar */}
      <div className="w-full max-w-5xl flex items-center justify-between px-4 py-2 bg-muted/50 border rounded-lg text-xs">
          <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                  <User className="h-3 w-3 text-primary" />
                  <span className="font-semibold">Active User:</span>
                  <span className="text-muted-foreground">{user?.displayName || user?.email}</span>
              </div>
              <div className="flex items-center gap-2 border-l pl-4">
                  <Cpu className="h-3 w-3 text-amber-500" />
                  <span className="font-semibold">Operational Context:</span>
                  <span className="text-muted-foreground text-green-600 font-mono">
                      {commandResult && commandResult.type !== 'unknown' 
                        ? `Awaiting Launch: ${commandResult.message}` 
                        : "Ready for Input"}
                  </span>
              </div>
          </div>
          <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-tighter font-bold text-muted-foreground">Ogeemo v1.6 (Stable Context)</span>
          </div>
      </div>

      <header className="relative text-center w-full max-w-5xl pt-4">
        <div className="absolute left-0 top-1/2 -translate-y-1/2">
            <Button asChild variant="outline" size="sm">
                <Link href="/action-manager">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Link>
            </Button>
        </div>
        <h1 className="text-4xl font-bold font-headline text-primary">Command Centre</h1>
        <p className="text-muted-foreground mt-1">Instant operational launcher. Navigate and act at the speed of thought.</p>
      </header>

      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Launcher Side */}
        <div className="lg:col-span-7 space-y-6 flex flex-col">
          <Card className="border-2 border-primary/20 shadow-xl overflow-hidden">
            <CardHeader className="bg-primary/5 border-b pb-4">
              <div className="flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Command Launcher</CardTitle>
              </div>
              <CardDescription>Enter a hub name, a page keyword, or a complex action.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="relative">
                  <Input
                    placeholder="e.g., 'Accounting', 'New contact', 'Go to Ledger', 'Track Call'..."
                    value={commandInput}
                    onChange={(e) => setCommandInput(e.target.value)}
                    className="h-14 text-lg pr-12 focus-visible:ring-primary border-primary/30"
                    onKeyDown={(e) => e.key === 'Enter' && handleExecuteCommand()}
                    autoFocus
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <Search className="h-5 w-5 text-muted-foreground" />
                  </div>
              </div>

              <div className="min-h-[140px] flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-4 transition-colors">
                  {!commandResult ? (
                      <div className="text-center space-y-2 opacity-40">
                          <BrainCircuit className="h-8 w-8 mx-auto" />
                          <p className="text-sm">Listening for operational intent...</p>
                      </div>
                  ) : (
                      <div className="w-full space-y-4 animate-in fade-in zoom-in-95 duration-200">
                          <div className="flex items-start gap-4">
                              <div className={cn(
                                  "p-3 rounded-full shrink-0",
                                  commandResult.type === 'unknown' ? "bg-muted" : "bg-primary/10"
                              )}>
                                  {commandResult.type === 'unknown' ? <HelpCircle className="h-6 w-6 text-muted-foreground" /> : <Zap className="h-6 w-6 text-primary" />}
                              </div>
                              <div>
                                  <h4 className="text-xl font-bold text-foreground">{commandResult.message}</h4>
                                  <p className="text-muted-foreground text-sm">{commandResult.description}</p>
                              </div>
                          </div>
                          {commandResult.type !== 'unknown' && (
                              <Button className="w-full h-12 text-lg font-bold group" onClick={handleExecuteCommand}>
                                  Execute & Launch <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                              </Button>
                          )}
                      </div>
                  )}
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t py-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <History className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recents:</span>
                </div>
                <div className="flex gap-2">
                    {recentCommands.length > 0 ? recentCommands.map((cmd, i) => (
                        <Button key={i} variant="ghost" className="h-6 px-2 text-[10px] border" onClick={() => setCommandInput(cmd)}>{cmd}</Button>
                    )) : <span className="text-[10px] text-muted-foreground italic">No history yet</span>}
                </div>
            </CardFooter>
          </Card>

          <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-900/30">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-400">Context-Aware Engine Active</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-500">
              The launcher now supports fuzzy matching. Typing <strong>"Account"</strong> or <strong>"Finances"</strong> will correctly detect the <strong>Accounting Hub</strong>.
            </AlertDescription>
          </Alert>
        </div>

        {/* Question Side */}
        <div className="lg:col-span-5 flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="border-b bg-muted/30 py-3 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm">Ask a Question</CardTitle>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleClearHistory} title="Clear conversation">
                    <RefreshCw className="h-3.5 w-3.5" />
                </Button>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-0">
                <ScrollArea className="h-full" ref={scrollRef}>
                    <div className="p-4 space-y-4">
                        {chatMessages.length === 0 && !isAiLoading && (
                            <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground opacity-50">
                                <Bot className="h-10 w-10 mb-2" />
                                <p className="text-xs">Ask Ogeemo about features,<br/>tax categories, or help.</p>
                            </div>
                        )}
                        {chatMessages.map((m: any) => (
                            <div key={m.id} className={cn("flex gap-3", m.sender === 'user' ? "flex-row-reverse" : "flex-row")}>
                                <Avatar className="h-7 w-7 shrink-0 border">
                                    <AvatarFallback className={cn("text-[10px]", m.sender === 'user' ? "bg-primary text-primary-foreground" : "bg-muted")}>
                                        {m.sender === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                                    </AvatarFallback>
                                </Avatar>
                                <div className={cn(
                                    "rounded-lg px-3 py-1.5 text-xs max-w-[85%] border shadow-sm",
                                    m.sender === 'user' ? "bg-primary text-primary-foreground border-primary" : "bg-card"
                                )}>
                                    <p className="whitespace-pre-wrap">{m.text}</p>
                                </div>
                            </div>
                        ))}
                        {isAiLoading && (
                            <div className="flex gap-3 items-center animate-pulse">
                                <Avatar className="h-7 w-7 shrink-0 border"><AvatarFallback className="bg-muted"><Bot className="h-3.5 w-3.5 text-primary" /></AvatarFallback></Avatar>
                                <div className="bg-muted border rounded-lg px-3 py-2 h-8 w-16 flex items-center justify-center">
                                    <LoaderCircle className="h-3.5 w-3.5 animate-spin text-primary" />
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
            <CardFooter className="border-t p-3">
                <form onSubmit={handleAskQuestion} className="flex w-full gap-2">
                    <Input
                        placeholder="Type a question..."
                        value={questionInput}
                        onChange={(e) => setQuestionInput(e.target.value)}
                        disabled={isAiLoading}
                        className="h-9 text-xs"
                    />
                    <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={!questionInput.trim() || isAiLoading}>
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
