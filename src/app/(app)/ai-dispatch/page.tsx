'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
    RefreshCw,
    User,
    Briefcase,
    FileDigit,
    TrendingUp,
    TrendingDown,
    Clock,
    FileText,
    Book,
    X
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
import { allMenuItems } from '@/lib/menu-items';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const ResultIcon = ({ type }: { type: string }) => {
    switch (type) {
        case 'Menu Item': return <Book className="h-4 w-4 text-muted-foreground" />;
        case 'Contact': return <User className="h-4 w-4 text-blue-500" />;
        case 'Project': return <Briefcase className="h-4 w-4 text-primary" />;
        case 'Invoice': return <FileDigit className="h-4 w-4 text-orange-500" />;
        case 'Income': return <TrendingUp className="h-4 w-4 text-green-500" />;
        case 'Expense': return <TrendingDown className="h-4 w-4 text-red-500" />;
        case 'Task': return <Clock className="h-4 w-4 text-purple-500" />;
        case 'File': return <FileText className="h-4 w-4 text-muted-foreground" />;
        default: return <Search className="h-4 w-4" />;
    }
};

export default function AiDispatchPage() {
  const [commandInput, setCommandInput] = useState('');
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
            ...allMenuItems.map(item => ({ ...item, type: 'Menu Item' })),
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

  const searchResults = useMemo(() => {
    if (!commandInput.trim() || commandInput.length < 2) return [];
    const term = commandInput.toLowerCase().trim();
    const keywords = term.split(/\s+/).filter(Boolean);

    return searchableData.filter(item => {
        let text = '';
        if (item.type === 'Menu Item') text = item.label;
        else if (item.type === 'Contact') text = `${item.name} ${item.email} ${item.businessName || ''}`;
        else if (item.type === 'Project') text = `${item.name} ${item.description || ''}`;
        else if (item.type === 'Invoice') text = `${item.invoiceNumber} ${item.companyName}`;
        else if (item.type === 'Income' || item.type === 'Expense') text = `${item.company} ${item.description}`;
        else if (item.type === 'Task') text = `${item.title} ${item.description || ''}`;
        else if (item.type === 'File') text = item.name;

        return keywords.every(k => text.toLowerCase().includes(k));
    }).slice(0, 50);
  }, [commandInput, searchableData]);

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

  const handleResultClick = (item: any) => {
    let path = '';
    if (item.type === 'Menu Item') {
        path = typeof item.href === 'string' ? item.href : item.href.pathname;
    } else if (item.type === 'Contact') {
        path = `/contacts?highlight=${item.id}`;
    } else if (item.type === 'Project') {
        path = `/projects/${item.id}/tasks`;
    } else if (item.type === 'Invoice') {
        path = `/accounting/invoicing-report?highlight=${item.id}`;
    } else if (item.type === 'Income') {
        path = `/accounting/ledgers?tab=income&highlight=${item.id}`;
    } else if (item.type === 'Expense') {
        path = `/accounting/ledgers?tab=expenses&highlight=${item.id}`;
    } else if (item.type === 'Task') {
        path = `/master-mind?eventId=${item.id}`;
    } else if (item.type === 'File') {
        path = `/document-manager?highlight=${item.id}`;
    }

    if (path) router.push(path);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 flex flex-col h-full items-center bg-muted/10">
      <header className="relative text-center w-full max-w-5xl">
        <div className="absolute left-0 top-1/2 -translate-y-1/2">
            <Button asChild variant="outline" size="sm">
                <Link href="/action-manager"><ArrowLeft className="mr-2 h-4 w-4" /> Exit</Link>
            </Button>
        </div>
        <h1 className="text-4xl font-bold font-headline text-primary tracking-tight">Ogeemo AI Dispatch</h1>
        <p className="text-muted-foreground">Unified terminal for navigation, creation, and global discovery.</p>
      </header>

      <div className="max-w-5xl w-full space-y-6">
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
                  <CardTitle className="text-lg">Unified Command Terminal</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="relative">
                  <Input
                    ref={launcherInputRef}
                    placeholder={launcherSpeech.isListening ? "Listening for intent..." : "Describe where you want to go or what you're looking for..."}
                    value={commandInput}
                    onChange={(e) => setCommandInput(e.target.value)}
                    className={cn("h-16 text-xl pr-24 rounded-xl shadow-inner", launcherSpeech.isListening && "ring-2 ring-destructive")}
                    onKeyDown={(e) => e.key === 'Enter' && handleExecuteCommand()}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <Button variant="ghost" size="icon" className={cn("h-10 w-10 rounded-full", launcherSpeech.isListening && "bg-destructive text-white")} onClick={handleMicClick}>
                        {launcherSpeech.isListening ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                      </Button>
                      <Zap className={cn("h-6 w-6", commandResult.type !== 'unknown' ? "text-primary" : "text-muted-foreground/20")} />
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Command Intent Section */}
                  <div className="min-h-[120px] flex items-center justify-center border-2 border-dashed rounded-xl p-6 bg-primary/5">
                      {commandInput ? (
                          <div className="w-full space-y-4">
                              <div className="flex items-center justify-between">
                                  <h4 className="text-2xl font-bold">{commandResult.message}</h4>
                                  <Badge variant="outline">{commandResult.category}</Badge>
                              </div>
                              <p className="text-muted-foreground text-sm">{commandResult.description}</p>
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

                  {/* Discovery Results Section */}
                  <Card className="border-2 border-dashed rounded-xl overflow-hidden bg-background flex flex-col">
                      <CardHeader className="p-2 border-b bg-muted/20 flex flex-row items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Discovery Results</span>
                          </div>
                          {commandInput && (
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCommandInput('')}>
                                  <X className="h-3 w-3" />
                              </Button>
                          )}
                      </CardHeader>
                      <CardContent className="p-0 flex-1">
                        <ScrollArea className="h-[300px]">
                            {isDataLoading ? (
                                <div className="flex flex-col items-center justify-center h-48 gap-2">
                                    <LoaderCircle className="h-6 w-6 animate-spin text-primary" />
                                    <p className="text-xs text-muted-foreground">Indexing data...</p>
                                </div>
                            ) : searchResults.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="w-12 text-[10px] uppercase font-bold">Type</TableHead>
                                            <TableHead className="text-[10px] uppercase font-bold">Name / Title</TableHead>
                                            <TableHead className="text-[10px] uppercase font-bold">Details</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {searchResults.map((item, index) => {
                                            let name = '';
                                            let details = '';
                                            if(item.type === 'Menu Item') {
                                                name = item.label;
                                                details = `Open ${item.label}`;
                                            } else if (item.type === 'Contact') {
                                                name = item.name;
                                                details = item.email || item.businessName || '';
                                            } else if (item.type === 'Project') {
                                                name = item.name;
                                                details = item.description || '';
                                            } else if (item.type === 'Invoice') {
                                                name = `Invoice #${item.invoiceNumber}`;
                                                details = item.companyName;
                                            } else if (item.type === 'Income' || item.type === 'Expense') {
                                                name = item.company;
                                                details = item.description;
                                            } else if (item.type === 'Task') {
                                                name = item.title;
                                                details = item.description || '';
                                            } else if (item.type === 'File') {
                                                name = item.name;
                                                details = item.type;
                                            }
                                            
                                            return (
                                                <TableRow 
                                                    key={`${item.type}-${index}`} 
                                                    onClick={() => handleResultClick(item)} 
                                                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                                                >
                                                    <TableCell>
                                                        <ResultIcon type={item.type} />
                                                    </TableCell>
                                                    <TableCell className="font-bold text-sm truncate max-w-[150px]">{name}</TableCell>
                                                    <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">{details}</TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            ) : commandInput.length >= 2 ? (
                                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground p-4">
                                    <p className="text-sm italic">No database matches found.</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground p-4 opacity-30">
                                    <Database className="h-6 w-6 mb-2" />
                                    <p className="text-xs">Type to search database...</p>
                                </div>
                            )}
                        </ScrollArea>
                      </CardContent>
                  </Card>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/10 text-[10px] uppercase tracking-widest text-muted-foreground justify-center py-2">
                Unified Index Status: {isDataLoading ? "Syncing..." : "Live & Connected"}
            </CardFooter>
        </Card>
      </div>
    </div>
  );
}
