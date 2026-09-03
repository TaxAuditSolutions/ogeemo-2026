'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft,
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

const CoPilotMark = ({ className = 'h-6 w-6' }: { className?: string }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M20 12H44C49.523 12 54 16.477 54 22V42C54 47.523 49.523 52 44 52H20C14.477 52 10 47.523 10 42V22C10 16.477 14.477 12 20 12Z" fill="currentColor" opacity="0.12" />
        <path d="M20 12H44C49.523 12 54 16.477 54 22V42C54 47.523 49.523 52 44 52H20C14.477 52 10 47.523 10 42V22C10 16.477 14.477 12 20 12Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
        <path d="M22 20H35V25H22V20Z" fill="currentColor" />
        <path d="M22 29H35V34H22V29Z" fill="currentColor" />
        <path d="M22 38H35V43H22V38Z" fill="currentColor" />
        <path d="M38 20H46V43H38V20Z" fill="currentColor" opacity="0.92" />
        <path d="M38 18L49 18L49 20L38 20V18Z" fill="currentColor" opacity="0.92" />
    </svg>
);
import { useToast } from '@/hooks/use-toast';

const DEFAULT_THREAD_TITLE_PATTERN = /^(chat\s*\d+|untitled chat)$/i;

const isDefaultThreadTitle = (title: string): boolean =>
    DEFAULT_THREAD_TITLE_PATTERN.test((title || '').trim());

import { cn } from '@/lib/utils';
import { processCommand } from '@/lib/command-processor';
import { allMenuItems } from '@/lib/menu-items';
import { groupedMenuItems } from '@/components/layout/main-menu';
import { useSpeechToText } from '@/hooks/use-speech-to-text';
import { useAuth } from '@/context/auth-context';
import {
    loadAssistantChatThreads,
    saveAssistantChatThread,
    updateAssistantChatThreadTitle,
    deleteAssistantChatThreads,
    createAssistantChatThread,
    normalizeMessages,
    type AssistantChatMessage,
    type AssistantChatThread,
} from '@/services/chat-history-service';
import { getContacts, type Contact } from '@/services/contact-service';
import { getFolders, type FolderData } from '@/services/contact-folder-service';
import { getCompanies, type Company } from '@/core/accounting-service';
import { getIndustries, type Industry } from '@/services/industry-service';
import { getUserProfile } from '@/core/user-profile-service';
import { getOrganization } from '@/core/organization-service';
import { listMyOrgMemberships, switchActiveOrg } from '@/app/actions/org-actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ContactFormDialog from '@/components/contacts/contact-form-dialog';
import {
    PenLine,
    Link as LinkIcon,
    LayoutDashboard,
    ArrowUpRight,
    Check,
    Copy,
    ChevronDown,
    X,
    Trash2,
    Plus,
    SquarePen,
    ListChecks,
    ListX
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface Message extends AssistantChatMessage { }

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
    const [threads, setThreads] = useState<AssistantChatThread[]>([]);
    const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
    const [selectedThreadIds, setSelectedThreadIds] = useState<string[]>([]);
    const [isEditingThreadTitle, setIsEditingThreadTitle] = useState<string | null>(null);
    const [draftThreadTitle, setDraftThreadTitle] = useState('');
    const [chatSearchQuery, setChatSearchQuery] = useState('');
    const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
    const [copiedChat, setCopiedChat] = useState(false);
    const [openMenuGroup, setOpenMenuGroup] = useState<string | null>(null);
    const [isThinking, setIsThinking] = useState(false);
    const { toast } = useToast();
    const { user, accessLevel, isMasterTenant } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [activeOrgName, setActiveOrgName] = useState('Current Tenant');
    const [activeOrgId, setActiveOrgId] = useState<string | undefined>(undefined);
    const [orgMemberships, setOrgMemberships] = useState<Array<{ orgId: string; companyName: string; isActive: boolean }>>([]);
    const [isSwitchingOrg, setIsSwitchingOrg] = useState(false);

    const roleLabel = useMemo(() => {
        if (isMasterTenant) return 'Master Tenant';
        if (accessLevel === 'super_admin') return 'Super Admin';
        if (accessLevel === 'org_admin') return 'Org Admin';
        if (accessLevel === 'editor') return 'Editor';
        if (accessLevel === 'viewer') return 'Viewer';
        return 'User';
    }, [accessLevel, isMasterTenant]);

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
    const activeThread = useMemo(
        () => threads.find((thread) => thread.id === activeThreadId) ?? threads[0] ?? null,
        [threads, activeThreadId]
    );
    const messages: Message[] = activeThread?.messages ?? [];

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isThinking]);

    useEffect(() => {
        let isMounted = true;

        const loadSession = async () => {
            if (!user?.uid) {
                setThreads([]);
                setActiveThreadId(null);
                return;
            }

            try {
                const savedThreads = await loadAssistantChatThreads(user.uid);
                if (!isMounted) {
                    return;
                }

                setThreads(savedThreads);
                setActiveThreadId((current) => current && savedThreads.some((thread) => thread.id === current)
                    ? current
                    : savedThreads[0]?.id ?? null);
            } catch (error) {
                console.warn('[AI Dispatch] Failed to load assistant chat history:', error);
                setThreads([]);
                setActiveThreadId(null);
            }
        };

        loadSession();

        return () => {
            isMounted = false;
        };
    }, [user?.uid]);

    useEffect(() => {
        const loadRuntimeOrgContext = async () => {
            if (!user?.uid) {
                setActiveOrgName('Current Tenant');
                setActiveOrgId(undefined);
                setOrgMemberships([]);
                return;
            }

            try {
                const [profile, memberships] = await Promise.all([
                    getUserProfile(user.uid),
                    listMyOrgMemberships().catch(() => [])
                ]);

                const orgId = profile?.orgId || memberships.find((m) => m.isActive)?.orgId || undefined;
                setActiveOrgId(orgId);
                setOrgMemberships(
                    memberships.map((m) => ({
                        orgId: m.orgId,
                        companyName: m.companyName,
                        isActive: m.isActive,
                    }))
                );

                if (!orgId) {
                    setActiveOrgName('Current Tenant');
                    return;
                }

                const org = await getOrganization(orgId);
                setActiveOrgName(org?.name || profile?.companyName || 'Current Tenant');
            } catch (err) {
                console.warn('[AI Dispatch] Failed to load active org context:', err);
                setActiveOrgName('Current Tenant');
                setActiveOrgId(undefined);
                setOrgMemberships([]);
            }
        };

        void loadRuntimeOrgContext();
    }, [user?.uid]);

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

    const filteredThreads = useMemo(() => {
        const query = chatSearchQuery.trim().toLowerCase();
        if (!query) {
            return threads;
        }
        return threads.filter((thread) =>
            thread.title.toLowerCase().includes(query) ||
            thread.messages.some((message) => message.content.toLowerCase().includes(query))
        );
    }, [chatSearchQuery, threads]);

    const menuGroups = useMemo(() => {
        const toItem = (href: string) => {
            const menuItem = allMenuItems.find((entry) => entry.href === href);
            const fallbackLabel = (href.split('/').filter(Boolean).slice(-1)[0] ?? href)
                .replace(/-/g, ' ')
                .replace(/\b\w/g, (char) => char.toUpperCase());
            return { href, label: menuItem?.label ?? fallbackLabel };
        };

        return Object.entries(groupedMenuItems)
            .filter(([, data]) => !data.masterTenantOnly || isMasterTenant || accessLevel === 'super_admin')
            .map(([name, data]) => ({
                name,
                icon: data.icon,
                items: data.items.map(toItem),
            }));
    }, [isMasterTenant, accessLevel]);

    const handleCopyMessage = (idx: number, content: string) => {
        void navigator.clipboard?.writeText(content).then(() => {
            setCopiedIdx(idx);
            setTimeout(() => setCopiedIdx((current) => (current === idx ? null : current)), 1500);
        }).catch((error) => {
            console.warn('[AI Dispatch] Failed to copy message:', error);
        });
    };

    const handleCopyChat = () => {
        if (!activeThread || activeThread.messages.length === 0) {
            return;
        }

        const transcript = activeThread.messages
            .map((message) => `${message.role === 'user' ? '**You:**' : '**Ogeemo:**'} ${message.content}`)
            .join('\n\n');

        void navigator.clipboard?.writeText(`# ${activeThread.title}\n\n${transcript}`).then(() => {
            setCopiedChat(true);
            setTimeout(() => setCopiedChat(false), 1500);
        }).catch((error) => {
            console.warn('[AI Dispatch] Failed to copy chat:', error);
        });
    };

    const persistThreadMessages = (nextThreadId: string, nextMessages: Message[]) => {
        if (!user?.uid) {
            return;
        }

        setThreads((previousThreads) => {
            const nextThread = previousThreads.find((thread) => thread.id === nextThreadId) ?? createAssistantChatThread('Untitled Chat', nextMessages);
            const sanitized = normalizeMessages(nextMessages);
            const updatedThread: AssistantChatThread = {
                ...nextThread,
                id: nextThreadId,
                title: nextThread.title || 'Untitled Chat',
                userId: user.uid,
                messages: sanitized,
                updatedAt: new Date(),
            };

            const existing = previousThreads.some((thread) => thread.id === nextThreadId)
                ? previousThreads.map((thread) => (thread.id === nextThreadId ? updatedThread : thread))
                : [updatedThread, ...previousThreads];

            void saveAssistantChatThread(user.uid, updatedThread).catch((error) => {
                console.warn('[AI Dispatch] Failed to persist thread state:', error);
            });

            return existing;
        });
    };

    const autoTitleThread = async (threadId: string, userMessage: string, assistantReply?: string) => {
        if (!user?.uid || !threadId) {
            return;
        }

        const currentTitle = threads.find((thread) => thread.id === threadId)?.title ?? '';
        if (!isDefaultThreadTitle(currentTitle)) {
            return;
        }

        try {
            const response = await fetch('/api/ogeemo-chat-title', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userMessage, assistantReply }),
            });
            const data = await response.json().catch(() => null);
            const generatedTitle = typeof data?.title === 'string' ? data.title.trim() : '';

            if (!response.ok || !generatedTitle) {
                return;
            }

            setThreads((previous) =>
                previous.map((thread) =>
                    thread.id === threadId && isDefaultThreadTitle(thread.title)
                        ? { ...thread, title: generatedTitle, updatedAt: new Date() }
                        : thread
                )
            );

            await updateAssistantChatThreadTitle(user.uid, threadId, generatedTitle);
        } catch (error) {
            console.warn('[AI Dispatch] Failed to generate chat title:', error);
        }
    };

    const handleCreateNewThread = () => {
        const newThread = createAssistantChatThread(`Chat ${threads.length + 1}`);
        const nextThreadId = newThread.id;
        setThreads((previous) => [newThread, ...previous]);
        setActiveThreadId(nextThreadId);
        setSelectedThreadIds([]);
        setIsEditingThreadTitle(nextThreadId);
        setDraftThreadTitle('');

        if (user?.uid) {
            void saveAssistantChatThread(user.uid, { ...newThread, userId: user.uid }).catch((error) => {
                console.warn('[AI Dispatch] Failed to create new thread:', error);
            });
        }
    };

    const handleOpenThread = (threadId: string) => {
        setActiveThreadId(threadId);
    };

    const handleRenameThread = async (threadId: string, title: string) => {
        const trimmedTitle = title.trim();
        if (!trimmedTitle) {
            return;
        }

        setThreads((previous) =>
            previous.map((thread) =>
                thread.id === threadId ? { ...thread, title: trimmedTitle, updatedAt: new Date() } : thread
            )
        );

        if (user?.uid) {
            await updateAssistantChatThreadTitle(user.uid, threadId, trimmedTitle);
        }

        setIsEditingThreadTitle(null);
        setDraftThreadTitle('');
    };

    const handleDeleteSelectedThreads = async () => {
        if (!selectedThreadIds.length || !user?.uid) {
            return;
        }

        const nextSelected = new Set(selectedThreadIds);
        setThreads((previous) => previous.filter((thread) => !nextSelected.has(thread.id)));
        setSelectedThreadIds([]);

        if (activeThreadId && nextSelected.has(activeThreadId)) {
            const remaining = threads.filter((thread) => !nextSelected.has(thread.id));
            setActiveThreadId(remaining[0]?.id ?? null);
        }

        await deleteAssistantChatThreads(user.uid, Array.from(nextSelected));
    };

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

    const handleOrgSwitch = async (nextOrgId: string) => {
        if (!user || !nextOrgId || nextOrgId === activeOrgId) return;

        setIsSwitchingOrg(true);
        try {
            await switchActiveOrg(nextOrgId);
            await user.getIdToken(true);
            const idToken = await user.getIdToken();
            await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
            });
            window.location.href = '/welcome';
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Tenant switch failed',
                description: error.message || 'Unable to switch the active tenant.',
            });
        } finally {
            setIsSwitchingOrg(false);
        }
    };

    const handleSend = async () => {
        const messageText = commandInput.trim();
        if (!messageText || isThinking) return;

        if (!activeThreadId) {
            const nextThread = createAssistantChatThread(`Chat ${threads.length + 1}`);
            setThreads((previous) => [nextThread, ...previous]);
            setActiveThreadId(nextThread.id);
        }

        const threadId = activeThreadId ?? (threads[0]?.id ?? 'new-chat');
        const detectedCommand = processCommand(messageText);
        const isActionCommand = detectedCommand.type !== 'unknown' && Boolean(detectedCommand.target);

        const newUserMessage: Message = { role: 'user', content: messageText, timestamp: new Date().toISOString() };
        const messagesWithUserTurn = [...(messages || []), newUserMessage];

        if (!activeThreadId) {
            const newThread = createAssistantChatThread(`Chat ${threads.length + 1}`, messagesWithUserTurn);
            setThreads((previous) => [newThread, ...previous]);
            setActiveThreadId(newThread.id);
            if (user?.uid) {
                void saveAssistantChatThread(user.uid, { ...newThread, userId: user.uid }).catch((error) => {
                    console.warn('[AI Dispatch] Failed to create and persist thread before sending:', error);
                });
            }
        } else {
            persistThreadMessages(threadId, messagesWithUserTurn);
        }

        setCommandInput('');

        if (isActionCommand) {
            const actionReply: Message = {
                role: 'model',
                content: `${detectedCommand.message}\n\n${detectedCommand.description ?? ''}`,
                timestamp: new Date().toISOString(),
            };
            const nextMessages = [...messagesWithUserTurn, actionReply];
            persistThreadMessages(threadId, nextMessages);
            void autoTitleThread(threadId, messageText, detectedCommand.message || messageText);
            if (detectedCommand.isExternal) {
                window.open(detectedCommand.target, '_blank', 'noopener,noreferrer');
            } else if (detectedCommand.target) {
                router.push(detectedCommand.target);
            }
            return;
        }

        setIsThinking(true);

        try {
            const response = await fetch('/api/ogeemo-assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: messageText,
                    sessionId: user?.uid || 'ogeemo-guest',
                    history: messagesWithUserTurn,
                    runtimeContext: {
                        userId: user?.uid,
                        orgId: activeOrgId,
                        accessLevel: accessLevel || undefined,
                        isMasterTenant,
                        currentPath: pathname,
                        activeOrgName,
                    },
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
                timestamp: new Date().toISOString(),
            };
            const nextMessages = [...messagesWithUserTurn, aiReply];
            persistThreadMessages(threadId, nextMessages);
            void autoTitleThread(threadId, messageText, aiReply.content);
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
        <div className="flex h-[calc(100vh-64px)] bg-muted/10">
            <aside className="w-80 border-r bg-background/80 backdrop-blur-sm p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                            <CoPilotMark className="h-4 w-4 text-primary" />
                        </div>
                        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">Chats</h2>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleCreateNewThread} className="h-8 px-2 gap-1">
                        <Plus className="h-4 w-4" />
                        New
                    </Button>
                </div>

                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={chatSearchQuery}
                        onChange={(event) => setChatSearchQuery(event.target.value)}
                        placeholder="Search chats by subject or content"
                        className="h-8 pl-8 text-sm"
                    />
                </div>
                <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 p-2">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            checked={filteredThreads.length > 0 && filteredThreads.every((thread) => selectedThreadIds.includes(thread.id))}
                            onCheckedChange={(checked) => {
                                if (checked) {
                                    setSelectedThreadIds((previous) => [
                                        ...new Set([...previous, ...filteredThreads.map((thread) => thread.id)]),
                                    ]);
                                } else {
                                    setSelectedThreadIds((previous) =>
                                        previous.filter((id) => !filteredThreads.some((thread) => thread.id === id))
                                    );
                                }
                            }}
                            aria-label="Select all chats"
                        />
                        <span className="text-xs text-muted-foreground">Select all</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setSelectedThreadIds([])}
                    >
                        <ListX className="h-3.5 w-3.5 mr-1" />
                        Clear
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                    {filteredThreads.length === 0 ? (
                        <div className="rounded-xl border border-dashed p-4 text-xs text-muted-foreground text-center">
                            {chatSearchQuery.trim() ? `No chats match "${chatSearchQuery.trim()}".` : 'No saved chats yet.'}
                        </div>
                    ) : (
                        filteredThreads.map((thread) => {
                            const isSelected = selectedThreadIds.includes(thread.id);
                            const isActive = activeThreadId === thread.id;

                            return (
                                <div
                                    key={thread.id}
                                    className={cn(
                                        'group flex items-center gap-2 rounded-xl border px-2 py-0.5 transition-all',
                                        isActive ? 'border-primary bg-primary/5' : 'border-transparent bg-card/60 hover:border-border'
                                    )}
                                >
                                    <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={(checked) => {
                                            setSelectedThreadIds((previous) =>
                                                checked
                                                    ? [...new Set([...previous, thread.id])]
                                                    : previous.filter((id) => id !== thread.id)
                                            );
                                        }}
                                        aria-label={`Select ${thread.title}`}
                                    />
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => handleOpenThread(thread.id)}
                                        onKeyDown={(event) => {
                                            if (event.target !== event.currentTarget) {
                                                // Key events from the nested subject/rename input must bubble untouched.
                                                return;
                                            }
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                handleOpenThread(thread.id);
                                            }
                                        }}
                                        className="flex-1 min-w-0 cursor-pointer text-left outline-none"
                                    >
                                        {isEditingThreadTitle === thread.id ? (
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    value={draftThreadTitle}
                                                    onChange={(event) => setDraftThreadTitle(event.target.value)}
                                                    placeholder="Type a subject (optional)"
                                                    className="h-6 text-sm"
                                                    onKeyDown={(event) => {
                                                        if (event.key === 'Enter') {
                                                            if (draftThreadTitle.trim()) {
                                                                void handleRenameThread(thread.id, draftThreadTitle);
                                                            } else {
                                                                setIsEditingThreadTitle(null);
                                                                setDraftThreadTitle('');
                                                            }
                                                        }
                                                        if (event.key === 'Escape') {
                                                            setIsEditingThreadTitle(null);
                                                            setDraftThreadTitle('');
                                                        }
                                                    }}
                                                    autoFocus
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => {
                                                        if (draftThreadTitle.trim()) {
                                                            void handleRenameThread(thread.id, draftThreadTitle);
                                                        } else {
                                                            setIsEditingThreadTitle(null);
                                                            setDraftThreadTitle('');
                                                        }
                                                    }}
                                                >
                                                    <Check className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="truncate text-sm font-medium leading-tight">{thread.title}</div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5"
                                            onClick={() => {
                                                setIsEditingThreadTitle(thread.id);
                                                setDraftThreadTitle(thread.title);
                                            }}
                                        >
                                            <SquarePen className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5 text-destructive hover:text-destructive"
                                            onClick={() => {
                                                const next = threads.filter((item) => item.id !== thread.id);
                                                setThreads(next);
                                                if (activeThreadId === thread.id) {
                                                    setActiveThreadId(next[0]?.id ?? null);
                                                }
                                                if (user?.uid) {
                                                    void deleteAssistantChatThreads(user.uid, [thread.id]);
                                                }
                                            }}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {selectedThreadIds.length > 0 && (
                    <Button variant="destructive" size="sm" onClick={() => void handleDeleteSelectedThreads()} className="w-full gap-2">
                        <Trash2 className="h-4 w-4" />
                        Delete selected ({selectedThreadIds.length})
                    </Button>
                )}
            </aside>

            <main className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-4 space-y-4">
                <header className="p-4 border-b bg-background flex items-center justify-between shadow-sm shrink-0 rounded-xl">
                    <div className="flex items-center gap-4">
                        <Button asChild variant="ghost" size="sm">
                            <Link href="/action-manager"><ArrowLeft className="h-4 w-4" /></Link>
                        </Button>
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 shadow-sm">
                                <CoPilotMark className="h-4 w-4 text-primary" />
                            </div>
                            <h1 className="text-xl font-bold font-headline text-primary tracking-tight">Ogeemo Co-Pilot</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap justify-end">
                        {orgMemberships.length > 1 ? (
                            <div className="min-w-[180px] max-w-[220px]">
                                <Select
                                    value={activeOrgId || ''}
                                    onValueChange={handleOrgSwitch}
                                    disabled={isSwitchingOrg}
                                >
                                    <SelectTrigger className="h-8 border-primary/20 bg-primary/5 text-primary text-[11px]">
                                        <SelectValue placeholder="Select tenant" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {orgMemberships.map((membership) => (
                                            <SelectItem key={membership.orgId} value={membership.orgId}>
                                                {membership.companyName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 flex gap-2 items-center">
                                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                {activeOrgName}
                            </Badge>
                        )}
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 uppercase text-[10px]">
                            {roleLabel}
                        </Badge>
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 uppercase text-[10px]">v2.1</Badge>
                    </div>
                </header>

                <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="mb-3 flex items-center gap-2 rounded-xl border bg-background/60 p-3">
                        <div className="text-sm font-semibold text-muted-foreground">Active chat</div>
                        {activeThread ? (
                            <div className="flex min-w-0 flex-1 items-center justify-center gap-2 text-base font-bold">
                                <span className="truncate text-center">{activeThread.title}</span>
                            </div>
                        ) : null}
                        {activeThread && activeThread.messages.length > 0 ? (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                                aria-label="Copy chat transcript"
                                title="Copy chat transcript"
                                onClick={handleCopyChat}
                            >
                                {copiedChat ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            </Button>
                        ) : null}
                    </div>

                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto space-y-5 pr-4 scrollbar-hide pt-4"
                    >
                        {messages.length === 0 && !isThinking ? (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                                <div className="space-y-4 opacity-50">
                                    <div className="p-6 bg-primary/10 rounded-full border border-primary/20 shadow-inner">
                                        <CoPilotMark className="h-12 w-12 text-primary" />
                                    </div>
                                    <div className="space-y-2">
                                        <h2 className="text-2xl font-headline uppercase tracking-tighter">Ogeemo Co-Pilot</h2>
                                        <p className="text-sm max-w-sm text-muted-foreground">Your AI partner for work, search, and operational guidance.</p>
                                    </div>
                                </div>
                                <div className="flex w-full max-w-md flex-col items-stretch gap-1.5">
                                    {menuGroups.map((group) => {
                                        const GroupIcon = group.icon;
                                        const isExpanded = openMenuGroup === group.name;
                                        return (
                                            <div key={group.name} className="w-full">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        // Single-item groups go straight to their destination.
                                                        if (group.items.length === 1) {
                                                            router.push(group.items[0].href);
                                                            return;
                                                        }
                                                        setOpenMenuGroup(isExpanded ? null : group.name);
                                                    }}
                                                    className={cn(
                                                        "flex w-full items-center justify-between gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                                                        isExpanded
                                                            ? "border-primary/40 bg-primary/10 text-primary shadow-sm"
                                                            : "border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
                                                    )}
                                                >
                                                    <span className="flex items-center gap-2">
                                                        {GroupIcon ? <GroupIcon className="h-3.5 w-3.5" /> : null}
                                                        {group.name}
                                                        <span className="text-[10px] font-normal text-muted-foreground">({group.items.length})</span>
                                                    </span>
                                                    {group.items.length === 1 ? (
                                                        <ArrowRight className="h-3 w-3" />
                                                    ) : isExpanded ? (
                                                        <X className="h-3 w-3" />
                                                    ) : (
                                                        <ChevronDown className="h-3 w-3" />
                                                    )}
                                                </button>
                                                {isExpanded ? (
                                                    <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/60 bg-background/40 p-2">
                                                        {group.items.map((item) => (
                                                            <button
                                                                key={item.href}
                                                                type="button"
                                                                onClick={() => {
                                                                    setOpenMenuGroup(null);
                                                                    router.push(item.href);
                                                                }}
                                                                className="rounded-full border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground/80 transition-all hover:border-primary/30 hover:text-primary"
                                                            >
                                                                {item.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : null}
                                            </div>
                                        );
                                    })}
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
                                            <div
                                                className={cn(
                                                    "mt-1 flex items-center gap-1.5 text-[10px]",
                                                    msg.role === 'user' ? "justify-end text-primary-foreground/70" : "text-muted-foreground"
                                                )}
                                            >
                                                {msg.timestamp ? (
                                                    <span>
                                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                ) : null}
                                                {msg.role === 'model' && msg.content ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyMessage(idx, msg.content)}
                                                        className="rounded p-0.5 transition-colors hover:bg-muted hover:text-foreground"
                                                        aria-label="Copy response"
                                                        title="Copy response"
                                                    >
                                                        {copiedIdx === idx ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                                    </button>
                                                ) : null}
                                            </div>
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
            </main>
        </div>
    );
}
