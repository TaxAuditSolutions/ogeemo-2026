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
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { 
    ArrowLeft, 
    BrainCircuit, 
    HelpCircle, 
    LoaderCircle, 
    User, 
    Terminal, 
    ArrowRight,
    Search,
    History,
    Zap,
    Wand2,
    Compass,
    Target,
    Mic,
    Square,
    Briefcase,
    Book,
    Database,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { processCommand } from '@/lib/command-processor';
import { useSpeechToText } from '@/hooks/use-speech-to-text';
import { getContacts, type Contact } from '@/services/contact-service';
import { getProjects, type Project } from '@/services/project-service';
import { allMenuItems, type MenuItem } from '@/lib/menu-items';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const RECENT_COMMANDS_KEY = 'ogeemoRecentCommandsV4';

const discoverableIntents = [
    { label: "Action Manager", cmd: "Action Manager" },
    { label: "Check Ledger", cmd: "Go to ledger" },
    { label: "New Project", cmd: "New project" },
    { label: "New Contact", cmd: "New contact" },
    { label: "Track Meeting", cmd: "Track meeting" },
    { label: "Accounting", cmd: "Accounting" },
];

type SearchResult = 
    | ({ resultType: 'Menu Item' } & MenuItem)
    | ({ resultType: 'Contact' } & Contact)
    | ({ resultType: 'Project' } & Project);

const ResultIcon = ({ type }: { type: SearchResult['resultType'] }) => {
    switch (type) {
        case 'Menu Item': return <Book className="h-4 w-4 text-muted-foreground" />;
        case 'Contact': return <User className="h-4 w-4 text-muted-foreground" />;
        case 'Project': return <Briefcase className="h-4 w-4 text-muted-foreground" />;
        default: return <Search className="h-4 w-4 text-muted-foreground" />;
    }
};

export default function OgeemoAiPage() {
  const [commandInput, setCommandInput] = useState('');
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchableData, setSearchableData] = useState<SearchResult[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  
  const launcherInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const launcherBaseTextRef = useRef('');
  const searchBaseTextRef = useRef('');

  // Voice for Launcher
  const launcherSpeech = useSpeechToText({
    onTranscript: (transcript) => {
      const newText = launcherBaseTextRef.current ? `${launcherBaseTextRef.current} ${transcript}` : transcript;
      setCommandInput(newText);
    },
  });

  // Voice for Search
  const searchSpeech = useSpeechToText({
    onTranscript: (transcript) => {
      const newText = searchBaseTextRef.current ? `${searchBaseTextRef.current} ${transcript}` : transcript;
      setSearchQuery(newText);
    },
  });

  // Load searchable data
  useEffect(() => {
    async function loadSearchData() {
        if (!user) return;
        try {
            const [contactsData, projectsData] = await Promise.all([
                getContacts(user.uid),
                getProjects(user.uid),
            ]);
            const combined: SearchResult[] = [
                ...allMenuItems.map(item => ({ ...item, resultType: 'Menu Item' as const })),
                ...contactsData.map(item => ({ ...item, resultType: 'Contact' as const })),
                ...projectsData.map(item => ({ ...item, resultType: 'Project' as const })),
            ];
            setSearchableData(combined);
        } catch (error) {
            console.error("Failed to index data", error);
        } finally {
            setIsDataLoading(false);
        }
    }
    loadSearchData();
    const saved = localStorage.getItem(RECENT_COMMANDS_KEY);
    if (saved) setRecentCommands(JSON.parse(saved));
  }, [user]);

  const commandResult = useMemo(() => processCommand(commandInput), [commandInput]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const term = searchQuery.toLowerCase().trim();
    const keywords = term.split(/\s+/).filter(Boolean);
    return searchableData.filter(item => {
        let text = '';
        if (item.resultType === 'Menu Item') text = item.label;
        else if (item.resultType === 'Contact') text = `${item.name} ${item.email} ${item.businessName || ''}`;
        else if (item.resultType === 'Project') text = `${item.name} ${item.description || ''}`;
        return keywords.every(k => text.toLowerCase().includes(k));
    }).slice(0, 15);
  }, [searchQuery, searchableData]);

  const handleMicClick = (target: 'launcher' | 'search') => {
    if (target === 'launcher') {
        if (launcherSpeech.isListening) launcherSpeech.stopListening();
        else {
            launcherBaseTextRef.current = commandInput.trim();
            launcherSpeech.startListening();
            launcherInputRef.current?.focus();
        }
    } else {
        if (searchSpeech.isListening) searchSpeech.stopListening();
        else {
            searchBaseTextRef.current = searchQuery.trim();
            searchSpeech.startListening();
            searchInputRef.current?.focus();
        }
    }
  };

  const handleExecuteCommand = () => {
    if (!commandResult || commandResult.type === 'unknown') {
        toast({ variant: 'destructive', title: "Command Not Recognized" });
        return;
    }
    if (launcherSpeech.isListening) launcherSpeech.stopListening();
    
    const updatedHistory = [commandInput, ...recentCommands.filter(c => c !== commandInput)].slice(0, 5);
    setRecentCommands(updatedHistory);
    localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(updatedHistory));
    
    if (commandResult.target) {
        if (commandResult.isExternal) window.open(commandResult.target, '_blank');
        else router.push(commandResult.target);
    }
  };

  const handleResultClick = (item: SearchResult) => {
    let path = '';
    if (item.resultType === 'Menu Item') path = item.href;
    else if (item.resultType === 'Contact') path = '/contacts';
    else if (item.resultType === 'Project') path = `/projects/${item.id}/tasks`;
    if (path) router.push(path);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 flex flex-col h-full items-center">
      {/* System Status Bar */}
      <div className="w-full max-w-6xl flex items-center justify-between px-4 py-2 bg-muted/50 border rounded-lg text-xs">
          <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-primary" />
                  <span className="font-semibold uppercase tracking-wider">Operator:</span>
                  <span className="text-muted-foreground font-mono">{user?.displayName || user?.email}</span>
              </div>
              <div className="flex items-center gap-2 border-l pl-4">
                  <Target className="h-3.5 w-3.5 text-amber-500" />
                  <span className="font-semibold uppercase tracking-wider">Context:</span>
                  <span className={cn(
                      "font-mono font-bold uppercase px-1.5 py-0.5 rounded",
                      commandResult.type === 'unknown' ? "text-muted-foreground bg-muted" : "text-green-600 bg-green-500/10"
                  )}>
                      {commandResult.type === 'unknown' ? "Listening" : commandResult.category || "Active"}
                  </span>
              </div>
          </div>
          <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-tighter font-bold text-muted-foreground">Ogeemo Logic Engine v4.0</span>
          </div>
      </div>

      <header className="relative text-center w-full max-w-6xl pt-4">
        <div className="absolute left-0 top-1/2 -translate-y-1/2">
            <Button asChild variant="outline" size="sm">
                <Link href="/action-manager">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Exit
                </Link>
            </Button>
        </div>
        <h1 className="text-4xl font-bold font-headline text-primary tracking-tight">Command Centre</h1>
        <p className="text-muted-foreground mt-1">High-fidelity logic terminal. Deterministic orchestration.</p>
      </header>

      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* LEFT: Intent Launcher */}
        <div className="lg:col-span-7 space-y-6 flex flex-col">
          <Card className={cn(
              "border-2 transition-all duration-300 shadow-xl overflow-hidden h-fit",
              commandResult.type !== 'unknown' ? "border-primary shadow-primary/10 scale-[1.01]" : "border-primary/20"
          )}>
            <CardHeader className="bg-primary/5 border-b pb-4">
              <div className="flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Launcher Terminal</CardTitle>
              </div>
              <CardDescription>Type a hub (e.g., "Accounting") or action (e.g., "New project").</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="relative">
                  <Input
                    ref={launcherInputRef}
                    placeholder={launcherSpeech.isListening ? "Listening..." : "Give a command..."}
                    value={commandInput}
                    onChange={(e) => setCommandInput(e.target.value)}
                    className={cn(
                        "h-16 text-xl pr-24 focus-visible:ring-primary border-primary/30 rounded-xl font-medium transition-all",
                        launcherSpeech.isListening && "border-destructive ring-destructive shadow-destructive/10"
                    )}
                    onKeyDown={(e) => e.key === 'Enter' && handleExecuteCommand()}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-10 w-10 rounded-full",
                            launcherSpeech.isListening ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                        )}
                        onClick={() => handleMicClick('launcher')}
                      >
                        {launcherSpeech.isListening ? <Square className="h-5 w-5 fill-current" /> : <Mic className="h-5 w-5" />}
                      </Button>
                      <Separator orientation="vertical" className="h-6" />
                      <Zap className={cn(
                          "h-6 w-6 transition-colors",
                          commandResult.type !== 'unknown' ? "text-primary animate-pulse" : "text-muted-foreground/20"
                      )} />
                  </div>
              </div>

              <div className="min-h-[100px] flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 bg-muted/5">
                  {commandInput.trim() === '' ? (
                      <div className="text-center opacity-40">
                          <BrainCircuit className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-sm font-medium">Awaiting Signal...</p>
                      </div>
                  ) : (
                      <div className="w-full space-y-4">
                          <div className="flex items-start gap-4">
                              <div className={cn("p-3 rounded-full shrink-0", commandResult.type === 'unknown' ? "bg-muted" : "bg-primary/10")}>
                                  {commandResult.type === 'unknown' ? <HelpCircle className="h-6 w-6 text-muted-foreground" /> : <Wand2 className="h-6 w-6 text-primary" />}
                              </div>
                              <div className="flex-1">
                                  <h4 className="text-2xl font-bold leading-tight tracking-tight">{commandResult.message}</h4>
                                  <p className="text-muted-foreground text-sm mt-1">{commandResult.description}</p>
                              </div>
                          </div>
                          {commandResult.type !== 'unknown' && (
                              <Button className="w-full h-12 text-lg font-bold group shadow-lg" onClick={handleExecuteCommand}>
                                  Launch Now <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                              </Button>
                          )}
                      </div>
                  )}
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t py-3 flex justify-between items-center px-6">
                <div className="flex items-center gap-2">
                    <History className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Recent Commands</span>
                </div>
                <div className="flex gap-2">
                    {recentCommands.map((cmd, i) => (
                        <Button key={i} variant="ghost" className="h-7 px-3 text-[10px] border bg-background" onClick={() => setCommandInput(cmd)}>{cmd}</Button>
                    ))}
                </div>
            </CardFooter>
          </Card>

          <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                  <Compass className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Common Signals</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {discoverableIntents.map((intent) => (
                      <Card 
                        key={intent.label} 
                        className="cursor-pointer hover:border-primary/50 transition-all group"
                        onClick={() => setCommandInput(intent.cmd)}
                      >
                          <CardContent className="p-3 flex items-center justify-between">
                              <span className="text-xs font-semibold">{intent.label}</span>
                              <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                          </CardContent>
                      </Card>
                  ))}
              </div>
          </div>
        </div>

        {/* RIGHT: Quick Search */}
        <div className="lg:col-span-5 flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col min-h-0 border-2 border-primary/10 shadow-lg">
            <CardHeader className="bg-primary/5 border-b py-4">
                <div className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Quick Search</CardTitle>
                </div>
                <CardDescription>Instant indexing of contacts, projects, and tools.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex flex-col gap-4 flex-1 min-h-0">
                <div className="relative">
                    <Input
                        ref={searchInputRef}
                        placeholder={searchSpeech.isListening ? "Listening..." : "Find anything..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={cn(
                            "h-12 text-lg pr-12 focus-visible:ring-primary border-primary/20 rounded-xl",
                            searchSpeech.isListening && "border-destructive ring-destructive"
                        )}
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full",
                            searchSpeech.isListening ? "bg-destructive text-destructive-foreground" : "text-muted-foreground hover:text-primary"
                        )}
                        onClick={() => handleMicClick('search')}
                    >
                        {searchSpeech.isListening ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}
                    </Button>
                </div>

                <ScrollArea className="flex-1 rounded-lg border bg-muted/5">
                    {isDataLoading ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground gap-2">
                            <LoaderCircle className="h-8 w-8 animate-spin" />
                            <p className="text-sm">Indexing records...</p>
                        </div>
                    ) : searchQuery.trim() ? (
                        searchResults.length > 0 ? (
                            <Table>
                                <TableBody>
                                    {searchResults.map((item, i) => (
                                        <TableRow key={i} onClick={() => handleResultClick(item)} className="cursor-pointer hover:bg-primary/5">
                                            <TableCell className="w-10 p-3"><ResultIcon type={item.resultType} /></TableCell>
                                            <TableCell className="p-3">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold truncate">
                                                        {item.resultType === 'Menu Item' ? item.label : item.name}
                                                    </span>
                                                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">
                                                        {item.resultType}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="p-3 text-right"><ArrowRight className="h-3 w-3 inline opacity-20" /></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="p-12 text-center text-muted-foreground italic text-sm">
                                No records match that signal.
                            </div>
                        )
                    ) : (
                        <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
                            <Database className="h-10 w-10 opacity-10" />
                            <p className="text-sm font-medium">Terminal data-link idle.</p>
                            <p className="text-[10px] uppercase tracking-widest">Awaiting search parameter</p>
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
            <CardFooter className="border-t py-3 bg-muted/20">
                <Button variant="ghost" size="sm" asChild className="w-full text-xs font-bold text-primary">
                    <Link href="/reports/search">Open Full Search Hub <ExternalLink className="h-3 w-3 ml-2" /></Link>
                </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ExternalLink(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" x2="21" y1="14" y2="3" />
        </svg>
    )
}
