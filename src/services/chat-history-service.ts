'use client';

import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';

export type AssistantChatRole = 'user' | 'model';

export interface AssistantChatMessage {
    role: AssistantChatRole;
    content: string;
}

export interface AssistantChatSession {
    userId: string;
    messages: AssistantChatMessage[];
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

function normalizeMessages(messages: AssistantChatMessage[]): AssistantChatMessage[] {
    return messages
        .filter((message) => message && (message.role === 'user' || message.role === 'model'))
        .map((message) => ({
            role: message.role,
            content: typeof message.content === 'string' ? message.content : String(message.content ?? ''),
        }))
        .filter((message) => message.content.trim().length > 0)
        .slice(-MAX_HISTORY_MESSAGES);
}

export async function loadAssistantChatSession(userId: string): Promise<AssistantChatSession | null> {
    const db = getDb();
    const sessionRef = doc(db, ASSISTANT_CHAT_COLLECTION, userId);
    const snapshot = await getDoc(sessionRef);

    if (!snapshot.exists()) {
        return null;
    }

    const data = snapshot.data();
    const messages = Array.isArray(data.messages) ? normalizeMessages(data.messages) : [];

    return {
        userId,
        messages,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
    };
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

export async function clearAssistantChatSession(userId: string): Promise<void> {
    const db = getDb();
    const sessionRef = doc(db, ASSISTANT_CHAT_COLLECTION, userId);

    await setDoc(
        sessionRef,
        {
            userId,
            messages: [],
            updatedAt: serverTimestamp(),
        },
        { merge: true }
    );
}