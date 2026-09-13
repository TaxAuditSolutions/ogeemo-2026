'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { processCommand } from '@/lib/command-processor';
import { getUserProfile } from '@/core/user-profile-service';
import {
    createAssistantChatThread,
    deleteAssistantChatThreads,
    loadAssistantChatThreads,
    normalizeMessages,
    saveAssistantChatThread,
    updateAssistantChatThreadTitle,
    type AssistantChatMessage,
    type AssistantChatThread,
} from '@/services/chat-history-service';

const DEFAULT_THREAD_TITLE_PATTERN = /^(chat\s*\d+|untitled chat)$/i;

interface OgeemoCopilotContextValue {
    threads: AssistantChatThread[];
    filteredThreads: AssistantChatThread[];
    activeThread: AssistantChatThread | null;
    activeThreadId: string | null;
    searchQuery: string;
    input: string;
    isLoading: boolean;
    isThinking: boolean;
    pendingAction: unknown;
    setSearchQuery: (query: string) => void;
    setInput: (input: string) => void;
    createThread: () => void;
    selectThread: (threadId: string) => void;
    renameThread: (threadId: string, title: string) => Promise<void>;
    deleteThread: (threadId: string) => Promise<void>;
    sendMessage: () => Promise<void>;
    clearPendingAction: () => void;
}

const OgeemoCopilotContext = createContext<OgeemoCopilotContextValue | null>(null);

export function OgeemoCopilotProvider({ children }: { children: React.ReactNode }) {
    const { user, accessLevel, isMasterTenant } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const pathname = usePathname();
    const [threads, setThreads] = useState<AssistantChatThread[]>([]);
    const threadsRef = useRef<AssistantChatThread[]>([]);
    const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isThinking, setIsThinking] = useState(false);
    const [pendingAction, setPendingAction] = useState<unknown>(undefined);
    const [activeOrgId, setActiveOrgId] = useState<string | undefined>();

    const replaceThreads = useCallback((nextThreads: AssistantChatThread[]) => {
        threadsRef.current = nextThreads;
        setThreads(nextThreads);
    }, []);

    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);

        if (!user?.uid) {
            replaceThreads([]);
            setActiveThreadId(null);
            setActiveOrgId(undefined);
            setIsLoading(false);
            return;
        }

        void Promise.all([
            loadAssistantChatThreads(user.uid),
            getUserProfile(user.uid).catch(() => null),
        ]).then(([savedThreads, profile]) => {
            if (!isMounted) return;
            replaceThreads(savedThreads);
            setActiveThreadId((current) =>
                current && savedThreads.some((thread) => thread.id === current)
                    ? current
                    : savedThreads[0]?.id ?? null
            );
            setActiveOrgId(profile?.orgId || undefined);
        }).catch((error) => {
            if (!isMounted) return;
            console.warn('[OCP] Failed to load chat history:', error);
            replaceThreads([]);
            setActiveThreadId(null);
        }).finally(() => {
            if (isMounted) setIsLoading(false);
        });

        return () => {
            isMounted = false;
        };
    }, [replaceThreads, user?.uid]);

    const activeThread = useMemo(
        () => threads.find((thread) => thread.id === activeThreadId) ?? threads[0] ?? null,
        [activeThreadId, threads]
    );

    const filteredThreads = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return threads;
        return threads.filter((thread) =>
            thread.title.toLowerCase().includes(query) ||
            thread.messages.some((message) => message.content.toLowerCase().includes(query))
        );
    }, [searchQuery, threads]);

    const persistThread = useCallback(async (thread: AssistantChatThread) => {
        if (!user?.uid) return;
        const nextThread = { ...thread, userId: user.uid, updatedAt: new Date() };
        const current = threadsRef.current;
        const nextThreads = current.some((item) => item.id === nextThread.id)
            ? current.map((item) => item.id === nextThread.id ? nextThread : item)
            : [nextThread, ...current];
        replaceThreads(nextThreads);
        await saveAssistantChatThread(user.uid, nextThread);
    }, [replaceThreads, user?.uid]);

    const createThread = useCallback(() => {
        const nextThread = createAssistantChatThread(`Chat ${threadsRef.current.length + 1}`);
        const withUser = { ...nextThread, userId: user?.uid ?? '' };
        replaceThreads([withUser, ...threadsRef.current]);
        setActiveThreadId(withUser.id);
        if (user?.uid) {
            void saveAssistantChatThread(user.uid, withUser).catch((error) => {
                console.warn('[OCP] Failed to create chat:', error);
            });
        }
    }, [replaceThreads, user?.uid]);

    const renameThread = useCallback(async (threadId: string, title: string) => {
        const trimmedTitle = title.trim();
        if (!trimmedTitle || !user?.uid) return;
        replaceThreads(threadsRef.current.map((thread) =>
            thread.id === threadId ? { ...thread, title: trimmedTitle, updatedAt: new Date() } : thread
        ));
        await updateAssistantChatThreadTitle(user.uid, threadId, trimmedTitle);
    }, [replaceThreads, user?.uid]);

    const deleteThread = useCallback(async (threadId: string) => {
        if (!user?.uid) return;
        const nextThreads = threadsRef.current.filter((thread) => thread.id !== threadId);
        replaceThreads(nextThreads);
        setActiveThreadId((current) => current === threadId ? nextThreads[0]?.id ?? null : current);
        await deleteAssistantChatThreads(user.uid, [threadId]);
    }, [replaceThreads, user?.uid]);

    const sendMessage = useCallback(async () => {
        const messageText = input.trim();
        if (!messageText || isThinking) return;

        let thread = threadsRef.current.find((item) => item.id === activeThreadId) ?? null;
        if (!thread) {
            thread = {
                ...createAssistantChatThread(`Chat ${threadsRef.current.length + 1}`),
                userId: user?.uid ?? '',
            };
            replaceThreads([thread, ...threadsRef.current]);
            setActiveThreadId(thread.id);
        }

        const threadId = thread.id;
        const userMessage: AssistantChatMessage = {
            role: 'user',
            content: messageText,
            timestamp: new Date().toISOString(),
        };
        const messagesWithUserTurn = normalizeMessages([...thread.messages, userMessage]);
        setInput('');

        try {
            await persistThread({ ...thread, messages: messagesWithUserTurn });
            const command = processCommand(messageText);
            let assistantContent: string;

            if (command.type !== 'unknown' && command.target) {
                assistantContent = `${command.message}\n\n${command.description ?? ''}`.trim();
                if (command.isExternal) window.open(command.target, '_blank', 'noopener,noreferrer');
                else router.push(command.target);
            } else {
                setIsThinking(true);
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
                        },
                    }),
                });
                const data = await response.json().catch(() => null);
                if (!response.ok) {
                    throw new Error(data?.details || data?.error || 'Failed to connect to Ogeemo Co-Pilot.');
                }
                setPendingAction(data?.action);
                assistantContent = typeof data?.answer === 'string' && data.answer.trim()
                    ? data.answer
                    : 'No answer returned from Ogeemo Co-Pilot.';
            }

            const assistantMessage: AssistantChatMessage = {
                role: 'model',
                content: assistantContent,
                timestamp: new Date().toISOString(),
            };
            const completedThread = {
                ...thread,
                messages: normalizeMessages([...messagesWithUserTurn, assistantMessage]),
            };
            await persistThread(completedThread);

            if (DEFAULT_THREAD_TITLE_PATTERN.test(thread.title.trim()) && user?.uid) {
                void fetch('/api/ogeemo-chat-title', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userMessage: messageText, assistantReply: assistantContent }),
                }).then((response) => response.ok ? response.json() : null).then(async (data) => {
                    const title = typeof data?.title === 'string' ? data.title.trim() : '';
                    if (title) await renameThread(threadId, title);
                }).catch((error) => console.warn('[OCP] Failed to generate chat title:', error));
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Ogeemo Co-Pilot unavailable',
                description: error instanceof Error ? error.message : 'Please try again.',
            });
        } finally {
            setIsThinking(false);
        }
    }, [
        accessLevel,
        activeOrgId,
        activeThreadId,
        input,
        isMasterTenant,
        isThinking,
        pathname,
        persistThread,
        renameThread,
        replaceThreads,
        router,
        toast,
        user?.uid,
    ]);

    const value = useMemo<OgeemoCopilotContextValue>(() => ({
        threads,
        filteredThreads,
        activeThread,
        activeThreadId,
        searchQuery,
        input,
        isLoading,
        isThinking,
        pendingAction,
        setSearchQuery,
        setInput,
        createThread,
        selectThread: setActiveThreadId,
        renameThread,
        deleteThread,
        sendMessage,
        clearPendingAction: () => setPendingAction(undefined),
    }), [
        threads,
        filteredThreads,
        activeThread,
        activeThreadId,
        searchQuery,
        input,
        isLoading,
        isThinking,
        pendingAction,
        createThread,
        renameThread,
        deleteThread,
        sendMessage,
    ]);

    return <OgeemoCopilotContext.Provider value={value}>{children}</OgeemoCopilotContext.Provider>;
}

export function useOgeemoCopilot() {
    const context = useContext(OgeemoCopilotContext);
    if (!context) {
        throw new Error('useOgeemoCopilot must be used within OgeemoCopilotProvider.');
    }
    return context;
}