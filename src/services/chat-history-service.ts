'use client';

import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';

export type AssistantChatRole = 'user' | 'model';

export interface AssistantChatMessage {
    role: AssistantChatRole;
    content: string;
}

export interface AssistantChatThread {
    id: string;
    title: string;
    userId: string;
    messages: AssistantChatMessage[];
    createdAt?: Date;
    updatedAt?: Date;
}

export interface AssistantChatSession {
    userId: string;
    messages: AssistantChatMessage[];
    threads?: AssistantChatThread[];
    createdAt?: Date;
    updatedAt?: Date;
}

const ASSISTANT_CHAT_COLLECTION = 'userAssistantChatSessions';
const MAX_HISTORY_MESSAGES = 20;

function getDb() {
    return getFirebaseServices().db;
}

function toDate(value: any): Date | undefined {
    if (!value) {
        return undefined;
    }

    if (value instanceof Date) {
        return value;
    }

    if (value instanceof Timestamp) {
        return value.toDate();
    }

    if (typeof value?.toDate === 'function') {
        return value.toDate();
    }

    return undefined;
}

export function normalizeMessages(messages: AssistantChatMessage[]): AssistantChatMessage[] {
    return messages
        .filter((message) => message && (message.role === 'user' || message.role === 'model'))
        .map((message) => ({
            role: message.role,
            content: typeof message.content === 'string' ? message.content : String(message.content ?? ''),
        }))
        .filter((message) => message.content.trim().length > 0)
        .slice(-MAX_HISTORY_MESSAGES);
}

export function createAssistantChatThread(title: string, messages: AssistantChatMessage[] = []): AssistantChatThread {
    const safeTitle = title?.trim() || 'Untitled Chat';

    return {
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title: safeTitle,
        userId: '',
        messages: normalizeMessages(messages),
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

function normalizeThread(raw: any, fallbackUserId: string): AssistantChatThread | null {
    if (!raw || typeof raw !== 'object') {
        return null;
    }

    const sanitizedMessages = Array.isArray(raw.messages) ? normalizeMessages(raw.messages) : [];
    const id = raw.id || `${fallbackUserId}-${Date.now()}`;
    const title = typeof raw.title === 'string' && raw.title.trim().length > 0 ? raw.title.trim() : 'Untitled Chat';

    return {
        id,
        title,
        userId: raw.userId || fallbackUserId,
        messages: sanitizedMessages,
        createdAt: toDate(raw.createdAt) || new Date(),
        updatedAt: toDate(raw.updatedAt) || new Date(),
    };
}

export async function loadAssistantChatSession(userId: string): Promise<AssistantChatSession | null> {
    const db = getDb();
    const sessionRef = doc(db, ASSISTANT_CHAT_COLLECTION, userId);
    const snapshot = await getDoc(sessionRef);

    if (!snapshot.exists()) {
        return null;
    }

    const data = snapshot.data();
    const threads = Array.isArray(data.threads)
        ? data.threads.map((thread: any) => normalizeThread(thread, userId)).filter(Boolean) as AssistantChatThread[]
        : [];

    const messages = Array.isArray(data.messages) ? normalizeMessages(data.messages) : [];

    return {
        userId,
        messages,
        threads,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
    };
}

export async function loadAssistantChatThreads(userId: string): Promise<AssistantChatThread[]> {
    const session = await loadAssistantChatSession(userId);
    const threads = session?.threads && session.threads.length > 0
        ? session.threads
        : session && session.messages.length > 0
            ? [
                {
                    ...createAssistantChatThread('Untitled Chat', session.messages),
                    userId,
                    createdAt: session.createdAt || new Date(),
                    updatedAt: session.updatedAt || new Date(),
                }
            ]
            : [];

    return threads
        .map((thread) => ({
            ...thread,
            id: thread.id || `${userId}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            title: thread.title || 'Untitled Chat',
            userId,
            messages: normalizeMessages(thread.messages),
        }))
        .sort((a, b) => new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime());
}

export async function saveAssistantChatSession(userId: string, messages: AssistantChatMessage[]): Promise<void> {
    const db = getDb();
    const sessionRef = doc(db, ASSISTANT_CHAT_COLLECTION, userId);

    await setDoc(
        sessionRef,
        {
            userId,
            messages: normalizeMessages(messages),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        },
        { merge: true }
    );
}

export async function saveAssistantChatThread(userId: string, thread: AssistantChatThread): Promise<void> {
    const db = getDb();
    const sessionRef = doc(db, ASSISTANT_CHAT_COLLECTION, userId);
    const session = await loadAssistantChatSession(userId);
    const existingThreads = session?.threads && session.threads.length > 0 ? session.threads : [];
    const normalizedThread: AssistantChatThread = {
        ...thread,
        userId,
        title: thread.title?.trim() || 'Untitled Chat',
        messages: normalizeMessages(thread.messages),
        updatedAt: thread.updatedAt || new Date(),
    };

    const nextThreads = existingThreads.some((item) => item.id === normalizedThread.id)
        ? existingThreads.map((item) => (item.id === normalizedThread.id ? normalizedThread : item))
        : [normalizedThread, ...existingThreads];

    await setDoc(
        sessionRef,
        {
            userId,
            threads: nextThreads,
            messages: normalizedThread.messages,
            createdAt: session?.createdAt || serverTimestamp(),
            updatedAt: serverTimestamp(),
        },
        { merge: true }
    );
}

export async function updateAssistantChatThreadTitle(userId: string, threadId: string, title: string): Promise<void> {
    const session = await loadAssistantChatSession(userId);
    const threads = session?.threads && session.threads.length > 0 ? session.threads : [];
    const nextThreads = threads.map((thread) =>
        thread.id === threadId
            ? { ...thread, title: title.trim() || 'Untitled Chat', updatedAt: new Date() }
            : thread
    );

    await setDoc(
        doc(getDb(), ASSISTANT_CHAT_COLLECTION, userId),
        {
            userId,
            threads: nextThreads,
            updatedAt: serverTimestamp(),
        },
        { merge: true }
    );
}

export async function deleteAssistantChatThreads(userId: string, threadIds: string[]): Promise<void> {
    const session = await loadAssistantChatSession(userId);
    const threads = session?.threads && session.threads.length > 0 ? session.threads : [];
    const nextThreads = threads.filter((thread) => !threadIds.includes(thread.id));
    const activeThread = nextThreads[0];

    await setDoc(
        doc(getDb(), ASSISTANT_CHAT_COLLECTION, userId),
        {
            userId,
            threads: nextThreads,
            messages: activeThread?.messages ?? [],
            updatedAt: serverTimestamp(),
        },
        { merge: true }
    );
}

export async function clearAssistantChatSession(userId: string): Promise<void> {
    const db = getDb();
    const sessionRef = doc(db, ASSISTANT_CHAT_COLLECTION, userId);

    await setDoc(
        sessionRef,
        {
            userId,
            messages: [],
            threads: [],
            updatedAt: serverTimestamp(),
        },
        { merge: true }
    );
}