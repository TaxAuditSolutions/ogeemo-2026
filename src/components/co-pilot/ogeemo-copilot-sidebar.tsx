'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    ArrowRight,
    Check,
    ExternalLink,
    Loader2,
    Pin,
    PinOff,
    Plus,
    Search,
    Send,
    SquarePen,
    Trash2,
} from 'lucide-react';
import { CoPilotMark } from '@/components/co-pilot/co-pilot-mark';
import { AssistantDispatchLink } from '@/components/co-pilot/assistant-dispatch-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useOgeemoCopilot } from '@/context/ogeemo-copilot-context';
import { useOgeemoCopilotSidebar } from '@/context/ogeemo-copilot-sidebar-context';
import { getContacts, type Contact } from '@/services/contact-service';
import { getFolders, type FolderData } from '@/services/contact-folder-service';
import { getCompanies, type Company } from '@/core/accounting-service';
import { getIndustries, type Industry } from '@/services/industry-service';
import {
    ASSISTANT_DESTINATIONS,
    resolveAssistantCapabilityActionWithRepair,
    type AssistantContactDraft,
    type AssistantMessageAction,
} from '@/ai/assistant-actions';

const ContactFormDialog = dynamic(() => import('@/components/contacts/contact-form-dialog'), {
    ssr: false,
    loading: () => (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Loader2 className="h-10 w-10 animate-spin text-white" />
        </div>
    ),
});

function CopilotPanelContent({
    mobile = false,
    onMessageAction,
}: {
    mobile?: boolean;
    onMessageAction?: (action: AssistantMessageAction) => void | Promise<void>;
}) {
    const {
        filteredThreads,
        activeThread,
        activeThreadId,
        searchQuery,
        input,
        isLoading,
        isThinking,
        setSearchQuery,
        setInput,
        createThread,
        selectThread,
        renameThread,
        deleteThread,
        sendMessage,
    } = useOgeemoCopilot();
    const { isPinned, togglePinned } = useOgeemoCopilotSidebar();
    const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
    const [draftTitle, setDraftTitle] = useState('');
    const [threadToDelete, setThreadToDelete] = useState<{ id: string; title: string } | null>(null);
    const messageScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = messageScrollRef.current;
        if (container) container.scrollTop = container.scrollHeight;
    }, [activeThread?.messages, isThinking]);

    const commitRename = async () => {
        if (!editingThreadId || !draftTitle.trim()) return;
        await renameThread(editingThreadId, draftTitle);
        setEditingThreadId(null);
        setDraftTitle('');
    };

    return (
        <div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
            <header className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
                    <CoPilotMark className="h-5 w-5" />
                </div>
                <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">Ogeemo Co-Pilot</h2>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={createThread}
                    aria-label="Start a new chat"
                    title="New chat"
                >
                    <Plus className="h-4 w-4" />
                </Button>
                {!mobile ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={togglePinned}
                        aria-label={isPinned ? 'Unpin Co-Pilot sidebar' : 'Pin Co-Pilot sidebar'}
                        aria-pressed={isPinned}
                        title={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
                    >
                        {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                    </Button>
                ) : null}
            </header>

            <section className="flex max-h-[38%] min-h-[180px] shrink-0 flex-col border-b border-sidebar-border p-2.5">
                <div className="relative mb-2 shrink-0">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search chats"
                        aria-label="Search chat history"
                        className="h-8 bg-background pl-8 text-xs"
                    />
                </div>

                <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
                    {isLoading ? (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="sr-only">Loading chats</span>
                        </div>
                    ) : filteredThreads.length === 0 ? (
                        <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                            {searchQuery.trim() ? 'No matching chats.' : 'No saved chats yet.'}
                        </p>
                    ) : filteredThreads.map((thread) => (
                        <div
                            key={thread.id}
                            className={cn(
                                'group flex min-h-8 items-center gap-1 rounded-md border px-1.5 py-1',
                                activeThreadId === thread.id
                                    ? 'border-primary/30 bg-primary/10'
                                    : 'border-transparent hover:bg-sidebar-accent'
                            )}
                        >
                            {editingThreadId === thread.id ? (
                                <>
                                    <Input
                                        value={draftTitle}
                                        onChange={(event) => setDraftTitle(event.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter') void commitRename();
                                            if (event.key === 'Escape') {
                                                setEditingThreadId(null);
                                                setDraftTitle('');
                                            }
                                        }}
                                        className="h-6 min-w-0 flex-1 bg-background px-1.5 text-xs text-black placeholder:text-muted-foreground"
                                        aria-label={`Rename ${thread.title}`}
                                        autoFocus
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 shrink-0"
                                        onClick={() => void commitRename()}
                                        disabled={!draftTitle.trim()}
                                        aria-label="Save chat title"
                                    >
                                        <Check className="h-3 w-3" />
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        className="min-w-0 flex-1 truncate px-1 text-left text-xs font-medium"
                                        onClick={() => selectThread(thread.id)}
                                        title={thread.title}
                                    >
                                        {thread.title}
                                    </button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 shrink-0"
                                        onClick={() => {
                                            setEditingThreadId(thread.id);
                                            setDraftTitle(thread.title);
                                        }}
                                        aria-label={`Rename ${thread.title}`}
                                        title="Rename chat"
                                    >
                                        <SquarePen className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                                        onClick={() => setThreadToDelete({ id: thread.id, title: thread.title })}
                                        aria-label={`Delete ${thread.title}`}
                                        title="Delete chat"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            <section className="flex min-h-0 flex-1 flex-col bg-background/70">
                <div className="flex h-10 shrink-0 items-center gap-2 border-b px-3">
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                        {activeThread?.title ?? 'New chat'}
                    </span>
                    <Button asChild variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                        <Link href="/co-pilot" aria-label="Open full Co-Pilot workspace" title="Open full workspace">
                            <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                    </Button>
                </div>

                <div ref={messageScrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
                    {!activeThread?.messages.length && !isThinking ? (
                        <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-muted-foreground">
                            <CoPilotMark className="h-9 w-9 text-primary/70" />
                            <p className="text-xs">Ask Ogeemo Co-Pilot about your work.</p>
                        </div>
                    ) : activeThread?.messages.map((message, index) => (
                        <div
                            key={`${message.timestamp ?? index}-${index}`}
                            className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
                        >
                            <div
                                className={cn(
                                    'max-w-[90%] overflow-hidden rounded-lg px-2.5 py-2 text-xs leading-5',
                                    message.role === 'user'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'border bg-card text-card-foreground'
                                )}
                            >
                                {message.role === 'model' ? (
                                    <div className="prose prose-sm max-w-none break-words text-current prose-p:my-1 prose-pre:max-w-full prose-pre:overflow-x-auto prose-pre:text-[11px]">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                                    </div>
                                ) : (
                                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                                )}
                                {message.role === 'model' && message.action ? (
                                    <div className="mt-2 border-t border-border/60 pt-2">
                                        {message.action.type === 'dispatch' ? (
                                            <AssistantDispatchLink action={message.action} />
                                        ) : (
                                            <>
                                                <p className="text-[11px] leading-4 text-muted-foreground">
                                                    {message.action.type === 'open_contact_form'
                                                        ? 'Review the prepared contact before saving.'
                                                        : 'Open the matching registry entry.'}
                                                </p>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="mt-1.5 h-7 w-full text-xs"
                                                    onClick={() => void onMessageAction?.(message.action!)}
                                                >
                                                    {message.action.type === 'open_contact_form' ? 'Review Contact' : 'Open Contact'}
                                                    <ArrowRight className="ml-1 h-3 w-3" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    ))}
                    {isThinking ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Thinking...
                        </div>
                    ) : null}
                </div>

                <div className="shrink-0 border-t bg-background p-2.5">
                    <div className="flex items-center gap-1.5">
                        <Input
                            value={input}
                            onChange={(event) => setInput(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' && !event.shiftKey) {
                                    event.preventDefault();
                                    void sendMessage();
                                }
                            }}
                            placeholder="Message Ogeemo..."
                            aria-label="Message Ogeemo Co-Pilot"
                            className="h-9 min-w-0 flex-1 text-xs text-black placeholder:text-muted-foreground"
                            disabled={isThinking}
                        />
                        <Button
                            type="button"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            onClick={() => void sendMessage()}
                            disabled={!input.trim() || isThinking}
                            aria-label="Send message"
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </section>

            <AlertDialog open={Boolean(threadToDelete)} onOpenChange={(open) => !open && setThreadToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {threadToDelete ? `“${threadToDelete.title}” will be permanently removed.` : 'This chat will be permanently removed.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                                if (threadToDelete) void deleteThread(threadToDelete.id);
                                setThreadToDelete(null);
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export function OgeemoCopilotSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    const { activeThread, activeThreadId } = useOgeemoCopilot();
    const {
        state,
        isMobile,
        isMobileOpen,
        isResizing,
        preferredWidth,
        effectiveWidth,
        layoutWidth,
        setMobileOpen,
        setPointerInside,
        setFocusInside,
        setPreferredWidth,
        setIsResizing,
    } = useOgeemoCopilotSidebar();

    // Assistant contact actions: the sidebar mirrors the full Co-Pilot
    // workspace so an open_contact_form action opens the ContactFormDialog
    // right here, pre-filled with the assistant draft.
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [contactToEdit, setContactToEdit] = useState<Contact | null>(null);
    const [contactDraft, setContactDraft] = useState<AssistantContactDraft | undefined>(undefined);
    const [folders, setFolders] = useState<FolderData[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [industries, setIndustries] = useState<Industry[]>([]);
    const supportDataRef = useRef<{ folders: FolderData[]; companies: Company[]; industries: Industry[] } | null>(null);

    const ensureSupportData = useCallback(async () => {
        if (supportDataRef.current) return supportDataRef.current;
        if (!user?.uid) throw new Error('You must be signed in to open the contact form.');
        const [nextFolders, nextCompanies, nextIndustries] = await Promise.all([
            getFolders(user.uid),
            getCompanies(user.uid).catch((error) => {
                console.warn('[CoPilotSidebar] Failed to load companies:', error);
                return [] as Company[];
            }),
            getIndustries(user.uid).catch((error) => {
                console.warn('[CoPilotSidebar] Failed to load industries:', error);
                return [] as Industry[];
            }),
        ]);
        supportDataRef.current = { folders: nextFolders, companies: nextCompanies, industries: nextIndustries };
        setFolders(nextFolders);
        setCompanies(nextCompanies);
        setIndustries(nextIndustries);
        return supportDataRef.current;
    }, [user?.uid]);

    const handleFoldersChange = useCallback((nextFolders: FolderData[]) => {
        supportDataRef.current = supportDataRef.current
            ? { ...supportDataRef.current, folders: nextFolders }
            : { folders: nextFolders, companies: [], industries: [] };
        setFolders(nextFolders);
    }, []);

    const handleMessageAction = useCallback(async (action: AssistantMessageAction) => {
        if (action.type === 'dispatch') {
            if (action.isExternal) {
                window.open(action.target, '_blank', 'noopener,noreferrer');
            } else if (action.target === ASSISTANT_DESTINATIONS.new_contact.target) {
                // The New Contact destination opens the create-contact form
                // right here instead of navigating away.
                setContactToEdit(null);
                setContactDraft(undefined);
                setIsFormOpen(true);
            } else {
                router.push(action.target);
            }
            return;
        }

        try {
            const support = await ensureSupportData();

            if (action.type === 'open_contact_form') {
                const resolved = resolveAssistantCapabilityActionWithRepair(action, support.folders);
                if (resolved?.type === 'open_contact_form') {
                    setContactToEdit(null);
                    setContactDraft(resolved.draft);
                    setIsFormOpen(true);
                    return;
                }
            } else if (action.type === 'open_contact') {
                const contacts = user?.uid ? await getContacts(user.uid) : [];
                const contact = contacts.find((entry) => entry.id === action.contactId);
                if (contact) {
                    setContactDraft(undefined);
                    setContactToEdit(contact);
                    setIsFormOpen(true);
                    return;
                }
                toast({
                    title: 'Registry link broken',
                    description: "I couldn't find the record in your local database.",
                    variant: 'destructive',
                });
                return;
            }

            toast({
                title: 'Action unavailable',
                description: 'This saved action is no longer valid for the active tenant.',
                variant: 'destructive',
            });
        } catch (error) {
            console.warn('[CoPilotSidebar] Failed to open assistant contact action:', error);
            toast({
                variant: 'destructive',
                title: 'Action unavailable',
                description: error instanceof Error ? error.message : 'Please try again.',
            });
        }
    }, [ensureSupportData, router, toast, user?.uid]);

    // Auto-open the prepared contact form as soon as the co-pilot returns an
    // open_contact_form action (mirrors the full Co-Pilot workspace). The
    // freshness window prevents stale thread messages from re-opening the form
    // when switching between chats or reloading the page.
    const lastAutoOpenedActionRef = useRef<string | null>(null);
    useEffect(() => {
        if (pathname === '/co-pilot' || pathname.startsWith('/co-pilot/')) return;
        const messages = activeThread?.messages ?? [];
        const last = messages[messages.length - 1];
        if (!last || last.role !== 'model' || last.action?.type !== 'open_contact_form') return;
        const messageAgeMs = last.timestamp ? Date.now() - new Date(last.timestamp).getTime() : Infinity;
        if (messageAgeMs > 3 * 60 * 1000) return;
        const actionKey = `${activeThreadId ?? ''}:${last.timestamp ?? ''}`;
        if (lastAutoOpenedActionRef.current === actionKey) return;
        lastAutoOpenedActionRef.current = actionKey;
        toast({ title: 'Opening your prepared contact form', description: 'Select the folder, add any details, then save.' });
        void handleMessageAction(last.action);
    }, [activeThread?.messages, activeThreadId, handleMessageAction, pathname, toast]);

    if (pathname === '/co-pilot' || pathname.startsWith('/co-pilot/')) return null;

    const contactFormDialog = (
        <ContactFormDialog
            isOpen={isFormOpen}
            onOpenChange={(open) => {
                setIsFormOpen(open);
                if (!open) setContactDraft(undefined);
            }}
            contactToEdit={contactToEdit}
            folders={folders}
            onFoldersChange={handleFoldersChange}
            onSave={() => {}}
            companies={companies}
            onCompaniesChange={setCompanies}
            customIndustries={industries}
            onCustomIndustriesChange={setIndustries}
            initialData={contactDraft}
        />
    );

    if (isMobile) {
        return (
            <>
                <Sheet open={isMobileOpen} onOpenChange={setMobileOpen}>
                    <SheetContent side="right" className="w-[min(92vw,420px)] p-0 sm:max-w-[420px]">
                        <CopilotPanelContent mobile onMessageAction={handleMessageAction} />
                    </SheetContent>
                </Sheet>
                {contactFormDialog}
            </>
        );
    }

    const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setIsResizing(true);
        event.currentTarget.dataset.startX = String(event.clientX);
        event.currentTarget.dataset.startWidth = String(preferredWidth);
    };

    const moveResize = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!isResizing) return;
        const startX = Number(event.currentTarget.dataset.startX);
        const startWidth = Number(event.currentTarget.dataset.startWidth);
        setPreferredWidth(startWidth + startX - event.clientX);
    };

    const stopResize = (event: React.PointerEvent<HTMLDivElement>) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        setIsResizing(false);
    };

    return (
        <>
            <div
                className="hidden shrink-0 print:hidden md:block"
                data-state={state}
                style={{ width: layoutWidth }}
                aria-label="Ogeemo Co-Pilot sidebar"
            >
                <aside
                    className={cn(
                        'fixed inset-y-0 right-0 z-20 flex overflow-hidden border-l border-sidebar-border bg-sidebar shadow-sm',
                        !isResizing && 'transition-[width] duration-200 ease-linear'
                    )}
                    style={{ width: layoutWidth }}
                    onPointerEnter={() => setPointerInside(true)}
                    onPointerLeave={() => setPointerInside(false)}
                    onFocusCapture={() => setFocusInside(true)}
                    onBlurCapture={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusInside(false);
                    }}
                >
                    <div
                        role="separator"
                        aria-label="Resize Co-Pilot sidebar"
                        aria-orientation="vertical"
                        aria-valuemin={240}
                        aria-valuemax={600}
                        aria-valuenow={Math.round(effectiveWidth)}
                        tabIndex={state === 'expanded' ? 0 : -1}
                        className="absolute inset-y-0 left-0 z-30 w-2 -translate-x-1/2 cursor-col-resize touch-none outline-none after:absolute after:inset-y-0 after:left-1/2 after:w-px hover:after:bg-primary focus-visible:after:bg-primary"
                        onPointerDown={startResize}
                        onPointerMove={moveResize}
                        onPointerUp={stopResize}
                        onPointerCancel={stopResize}
                        onKeyDown={(event) => {
                            if (event.key === 'ArrowLeft') {
                                event.preventDefault();
                                setPreferredWidth(preferredWidth + 10);
                            }
                            if (event.key === 'ArrowRight') {
                                event.preventDefault();
                                setPreferredWidth(preferredWidth - 10);
                            }
                        }}
                    />
                    {state === 'collapsed' ? (
                        <div className="flex h-full w-12 flex-col items-center pt-3 text-primary">
                            <CoPilotMark className="h-6 w-6" />
                            <span className="sr-only">Hover or focus to open Ogeemo Co-Pilot</span>
                        </div>
                    ) : (
                        <div className="h-full min-w-0 flex-1">
                            <CopilotPanelContent onMessageAction={handleMessageAction} />
                        </div>
                    )}
                </aside>
            </div>
            {contactFormDialog}
        </>
    );
}