'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
    ArrowRight,
    Send,
    Bot,
    User as UserIcon,
    Loader2,
    Mail,
    Phone,
    ExternalLink,
    MessageSquare,
    FolderOpen,
    UserCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { processCommand } from '@/lib/command-processor';
import { useSpeechToText } from '@/hooks/use-speech-to-text';
import { useAuth } from '@/context/auth-context';
import { getContacts, type Contact } from '@/services/contact-service';
import { getFolders, type FolderData } from '@/services/contact-folder-service';
import { getCompanies, type Company } from '@/core/accounting-service';
import { getIndustries, type Industry } from '@/services/industry-service';
import ContactFormDialog from '@/components/contacts/contact-form-dialog';
import {
    PenLine,
    Link as LinkIcon,
    LayoutDashboard,
    ArrowUpRight
} from 'lucide-react';

interface Message {
    role: 'user' | 'model';
    content: string;
}

const markdownComponents = {
    p: ({ children }: { children?: React.ReactNode }) => <p className="mb-3 leading-6 last:mb-0">{children}</p>,
    ul: ({ children }: { children?: React.ReactNode }) => <ul className="mb-4 mt-1 list-disc pl-6 space-y-2">{children}</ul>,
    ol: ({ children }: { children?: React.ReactNode }) => <ol className="mb-4 mt-1 list-decimal pl-6 space-y-2">{children}</ol>,
    li: ({ children }: { children?: React.ReactNode }) => <li className="pl-1 leading-6">{children}</li>,
    h1: ({ children }: { children?: React.ReactNode }) => <h1 className="mb-3 mt-2 text-base font-bold">{children}</h1>,
    h2: ({ children }: { children?: React.ReactNode }) => <h2 className="mb-3 mt-2 text-[15px] font-semibold">{children}</h2>,
    h3: ({ children }: { children?: React.ReactNode }) => <h3 className="mb-2 mt-2 text-sm font-semibold">{children}</h3>,
    strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold text-foreground">{children}</strong>,
    a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
        <a href={href} target="_blank" rel="noreferrer" className="font-medium text-primary underline underline-offset-4">
            {children}
        </a>
    ),
    code: ({ children }: { children?: React.ReactNode }) => <code className="rounded bg-muted px-1.5 py-0.5 text-[0.9em]">{children}</code>,
    pre: ({ children }: { children?: React.ReactNode }) => <pre className="mb-4 overflow-x-auto rounded-md bg-muted p-3 text-xs">{children}</pre>,
    blockquote: ({ children }: { children?: React.ReactNode }) => <blockquote className="mb-4 border-l-2 border-border pl-3 italic">{children}</blockquote>,
    hr: () => <hr className="my-4 border-border" />,
};

const MaterializedContactCard = ({ contact, onLaunch }: { contact: Contact, onLaunch: (id: string) => void }) => {
    return (
        <div
            onClick={() => onLaunch(contact.id)}
            className="group flex items-center justify-between p-3 mt-2 bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-xl cursor-pointer transition-all duration-300 shadow-sm animate-in fade-in slide-in-from-top-2"
        >
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-bold shadow-md ring-2 ring-primary/20">
                    {contact.name?.substring(0, 1).toUpperCase()}
                </div>
                <div>
                    <h4 className="font-bold text-sm tracking-tight">{contact.name}</h4>
                    <p className="text-[10px] uppercase font-bold text-primary/70">{contact.businessName || 'Ogeemo Member'}</p>
                </div>
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Badge variant="outline" className="text-[10px] bg-white border-primary/20 text-primary">Open Registry</Badge>
                <ArrowUpRight className="h-4 w-4 text-primary" />
            </div>
        </div>
    );
};

export default function AiDispatchPage() {
    const [commandInput, setCommandInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isThinking, setIsThinking] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();
    const router = useRouter();
    const [contacts, setContacts] = useState<Contact[]>([]);

    // Data Bridge Support for Registry Launcher
    const [folders, setFolders] = useState<FolderData[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [industries, setIndustries] = useState<Industry[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [contactToEdit, setContactToEdit] = useState<Contact | null>(null);

    const launcherInputRef = useRef<HTMLInputElement>(null);
    const launcherBaseTextRef = useRef('');
    const scrollRef = useRef<HTMLDivElement>(null);

    const launcherSpeech = useSpeechToText({
        onTranscript: (transcript) => {
            const newText = launcherBaseTextRef.current ? `${launcherBaseTextRef.current} ${transcript}` : transcript;
            setCommandInput(newText);
        },
    });

    const commandResult = useMemo(() => processCommand(commandInput), [commandInput]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isThinking]);

    useEffect(() => {
        const loadSupportData = async () => {
            if (user?.uid) {
                try {
                    const [f, c, i] = await Promise.all([
                        getFolders(user.uid),
                        getCompanies(user.uid),
                        getIndustries(user.uid)
                    ]);
                    setFolders(f);
                    setCompanies(c);
                    setIndustries(i);
                } catch (err) {
                    console.warn("[AI Dispatch] Failed to load registry support data:", err);
                }
            }
        };
        loadSupportData();
    }, [user]);

    const handleLaunchRegistry = (contactId: string) => {
        // 1. Hardcoded Support for Dan/Julie
        if (contactId === 'dan-admin-id') {
            setContactToEdit({ id: 'dan', name: 'Dan (Ogeemo Administrator)', email: 'dan@ogeemo.com', businessName: 'Ogeemo Mastermind', businessPhone: '555-0199', cellPhone: '555-0100', folderId: folders[0]?.id || 'default' } as any);
            setIsFormOpen(true);
            return;
        }
        if (contactId === 'julie-support-id') {
            setContactToEdit({ id: 'julie', name: 'Julie (Ogeemo Support)', email: 'julie@ogeemo.com', businessName: 'Support Specialist', businessPhone: '555-0188', folderId: folders[0]?.id || 'default' } as any);
            setIsFormOpen(true);
            return;
        }

        // 2. Real Contact Launch
        const contact = contacts.find(c => c.id === contactId);
        if (contact) {
            setContactToEdit(contact);
            setIsFormOpen(true);
        } else {
            toast({ title: "Registry Link Broken", description: "I couldn't find the record in your local database.", variant: "destructive" });
        }
    };

    const handleMicClick = () => {
        if (launcherSpeech.isListening) {
            launcherSpeech.stopListening();
        } else {
            launcherBaseTextRef.current = commandInput.trim();
            launcherSpeech.startListening();
            launcherInputRef.current?.focus();
        }
    };

    const handleExecuteAction = () => {
        if (commandResult.type === 'unknown') return;
        if (commandResult.target) {
            if (commandResult.isExternal) window.open(commandResult.target, '_blank');
            else router.push(commandResult.target);
        }
    };

    const handleSend = async () => {
        const messageText = commandInput.trim();
        if (!messageText || isThinking) return;

        // 1. Add user message locally
        const newUserMessage: Message = { role: 'user', content: messageText };
        setMessages(prev => [...prev, newUserMessage]);
        setCommandInput('');
        setIsThinking(true);

        try {
            const response = await fetch('/api/ogeemo-assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: messageText,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.details || data?.error || 'Failed to connect to Ogeemo Assistant.');
            }

            const aiReply: Message = {
                role: 'model',
                content: typeof data?.answer === 'string' && data.answer.trim().length > 0
                    ? data.answer
                    : 'No answer returned from Ogeemo Assistant.',
            };
            setMessages(prev => [...prev, aiReply]);

        } catch (err: any) {
            console.error("[Ogeemo Dispatch Signal Failure]:", err);
            toast({
                variant: 'destructive',
                title: 'Transmission Interrupted',
                description: err.message || 'The Command Centre is currently stabilizing the bridge. Please try again.',
            });
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-muted/10">
            {/* Dynamic Header */}
            <header className="p-4 border-b bg-background flex items-center justify-between shadow-sm shrink-0">
                <div className="flex items-center gap-4">
                    <Button asChild variant="ghost" size="sm">
                        <Link href="/action-manager"><ArrowLeft className="h-4 w-4" /></Link>
                    </Button>
                    <div className="flex items-center gap-2">
                        <BrainCircuit className="h-6 w-6 text-primary animate-pulse" />
                        <h1 className="text-xl font-bold font-headline text-primary tracking-tight">Ogeemo Dispatch</h1>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 flex gap-2 items-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        Unified Search Active
                    </Badge>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 uppercase text-[10px]">v2.1</Badge>
                </div>
            </header>

            {/* Main Orchestration Layer */}
            <div className="flex-1 overflow-hidden flex flex-col max-w-4xl w-full mx-auto p-4 space-y-4">

                {/* Chat History Area */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto space-y-5 pr-4 scrollbar-hide pt-4"
                >
                    {messages.length === 0 && !isThinking ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                            <div className="p-6 bg-primary/10 rounded-full border border-primary/20 shadow-inner">
                                <BrainCircuit className="h-12 w-12 text-primary" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-headline uppercase tracking-tighter">Ogeemo Command Centre</h2>
                                <p className="text-sm max-w-sm text-muted-foreground">Unified Intelligence: Dispatch commands or search across all records.</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={cn(
                                        "flex w-full gap-4 animate-in fade-in-0 slide-in-from-bottom-1 duration-200",
                                        msg.role === 'user' ? "justify-end" : "justify-start"
                                    )}
                                >
                                    <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-sm", msg.role === 'user' ? "bg-primary text-white" : "bg-card border")}>
                                        {msg.role === 'user' ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4 text-primary" />}
                                    </div>
                                    <div
                                        className={cn(
                                            msg.role === 'user'
                                                ? "max-w-[78%] p-4 rounded-2xl rounded-tr-none text-sm leading-relaxed shadow-sm bg-primary text-primary-foreground"
                                                : "max-w-[92%] rounded-2xl rounded-tl-none p-0 text-[15px] leading-relaxed bg-transparent border-0 shadow-none"
                                        )}
                                    >
                                        {msg.role === 'model' && msg.content.includes('[[LAUNCH_REGISTRY:') ? (
                                            <>
                                                <div className="prose prose-sm max-w-none text-foreground prose-p:my-0 prose-headings:my-0 prose-strong:text-foreground prose-code:text-foreground">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                                        {msg.content.split('[[LAUNCH_REGISTRY:')[0]}
                                                    </ReactMarkdown>
                                                </div>
                                                {(() => {
                                                    const idMatches = Array.from(msg.content.matchAll(/\[\[LAUNCH_REGISTRY:(.*?)\]\]/g));
                                                    return idMatches.map((match, i) => {
                                                        const contactId = match[1];
                                                        // Identify the contact details for the chip
                                                        let contactLabel = "Registry Entry";
                                                        let contactBiz = "Ogeemo Data";

                                                        if (contactId === 'dan-admin-id') {
                                                            contactLabel = "Dan (Ogeemo Administrator)";
                                                            contactBiz = "Ogeemo Mastermind";
                                                        } else if (contactId === 'julie-support-id') {
                                                            contactLabel = "Julie (Ogeemo Support)";
                                                            contactBiz = "Support Specialist";
                                                        } else {
                                                            const c = contacts.find(r => r.id === contactId);
                                                            if (c) {
                                                                contactLabel = c.name;
                                                                contactBiz = c.businessName || "Contact";
                                                            }
                                                        }

                                                        return (
                                                            <MaterializedContactCard
                                                                key={i}
                                                                contact={{ id: contactId, name: contactLabel, businessName: contactBiz } as any}
                                                                onLaunch={handleLaunchRegistry}
                                                            />
                                                        );
                                                    });
                                                })()}
                                                {msg.content.split(']]').slice(-1)[0].trim().length > 0 ? (
                                                    <div className="mt-2 opacity-80 text-xs">
                                                        <div className="prose prose-sm max-w-none text-foreground prose-p:my-0 prose-headings:my-0 prose-strong:text-foreground prose-code:text-foreground">
                                                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                                                {msg.content.split(']]').slice(-1)[0]}
                                                            </ReactMarkdown>
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </>
                                        ) : msg.role === 'model' ? (
                                            <div className="prose prose-sm max-w-none text-foreground prose-p:my-0 prose-headings:my-0 prose-strong:text-foreground prose-code:text-foreground">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                                    {msg.content}
                                                </ReactMarkdown>
                                            </div>
                                        ) : (
                                            <div className="whitespace-pre-wrap">{msg.content}</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isThinking && (
                                <div className="flex gap-4 mr-auto animate-pulse">
                                    <div className="h-8 w-8 rounded-full bg-card border flex items-center justify-center">
                                        <Loader2 className="h-4 w-4 text-primary animate-spin" />
                                    </div>
                                    <div className="bg-card border p-4 rounded-2xl text-xs font-mono uppercase tracking-widest">
                                        Thinking...
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Action Preview (Chips) */}
                {commandInput && commandResult.type !== 'unknown' && !isThinking && (
                    <Card className="absolute bottom-28 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-xl border-primary shadow-2xl animate-in slide-in-from-bottom-4 duration-300 z-10">
                        <CardContent className="p-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-primary/10 p-2 rounded-lg">
                                    <Zap className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm tracking-tight">{commandResult.message}</span>
                                        <Badge className="text-[10px] h-4">{commandResult.category}</Badge>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">{commandResult.description}</p>
                                </div>
                            </div>
                            <Button size="sm" onClick={handleExecuteAction} className="h-8 font-bold text-xs uppercase">Dispatch</Button>
                        </CardContent>
                    </Card>
                )}

                {/* Input Interface */}
                <div className="p-4 bg-background border-t rounded-3xl shadow-xl border relative">
                    <div className="flex gap-2 items-center">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-12 w-12 rounded-full", launcherSpeech.isListening && "bg-destructive text-white")}
                            onClick={handleMicClick}
                        >
                            {launcherSpeech.isListening ? <Square className="h-5 w-5 fill-current" /> : <Mic className="h-6 w-6" />}
                        </Button>
                        <Input
                            ref={launcherInputRef}
                            value={commandInput}
                            onChange={(e) => setCommandInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Message Ogeemo Assistant..."
                            className="flex-1 h-12 border-none shadow-none text-lg focus-visible:ring-0"
                        />
                        <Button
                            size="icon"
                            className="h-12 w-12 rounded-full shadow-lg"
                            disabled={!commandInput.trim() || isThinking}
                            onClick={handleSend}
                        >
                            <Send className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                <p className="text-[10px] text-center text-muted-foreground uppercase tracking-[0.2em] pb-2">
                    Intelligence Instance Stable • Version 3.0
                </p>

                {/* Global Registry Form Launcher */}
                <ContactFormDialog
                    isOpen={isFormOpen}
                    onOpenChange={setIsFormOpen}
                    contactToEdit={contactToEdit}
                    folders={folders}
                    onFoldersChange={setFolders}
                    onSave={(c) => {
                        if (contactToEdit) {
                            setContacts(prev => prev.map(old => old.id === c.id ? c : old));
                        } else {
                            setContacts(prev => [...prev, c]);
                        }
                    }}
                    companies={companies}
                    onCompaniesChange={setCompanies}
                    customIndustries={industries}
                    onCustomIndustriesChange={setIndustries}
                />
            </div>
        </div>
    );
}
