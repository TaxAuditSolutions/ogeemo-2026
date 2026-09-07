'use client';

import { doc, getDoc, getDocFromCache, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';

/**
 * Personal notes — the Co-Pilot chat pattern applied to notes.
 * One Firestore document per user: userNoteSessions/{uid}, holding the
 * user's notes array. Content lives in each entry — no folders, no Storage.
 */

export interface UserNote {
    id: string;
    title: string;
    content: string;
    userId: string;
    driveFileId?: string;
    driveSyncedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

const USER_NOTES_COLLECTION = 'userNoteSessions';

function getDb() {
    return getFirebaseServices().db;
}

function toDate(value: any): Date | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    if (value instanceof Timestamp) return value.toDate();
    if (typeof value?.toDate === 'function') return value.toDate();
    return undefined;
}

function toTime(value?: Date): number {
    return value?.getTime() ?? 0;
}

function newId(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createUserNote(content = ''): UserNote {
    return {
        id: newId(),
        title: '',
        content,
        userId: '',
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

/** Titles a note from its first non-empty line, like chats title themselves. */
export function deriveNoteTitle(content: string): string {
    const firstLine = content
        .split('\n')
        .map((line) => line.trim())
        .find((line) => line.length > 0);
    const derived = firstLine || 'Untitled Note';
    return derived.length > 60 ? `${derived.slice(0, 57)}...` : derived;
}

function normalizeNote(raw: any, fallbackUserId: string): UserNote | null {
    if (!raw || typeof raw !== 'object') return null;
    const note: UserNote = {
        id: raw.id || newId(),
        title: typeof raw.title === 'string' ? raw.title : '',
        content: typeof raw.content === 'string' ? raw.content : '',
        userId: raw.userId || fallbackUserId,
        createdAt: toDate(raw.createdAt) || new Date(),
        updatedAt: toDate(raw.updatedAt) || new Date(),
    };
    // Optional Drive linkage — conditionally assigned so no undefined values
    // ever reach Firestore (it rejects undefined field values).
    if (typeof raw.driveFileId === 'string' && raw.driveFileId) note.driveFileId = raw.driveFileId;
    const syncedAt = toDate(raw.driveSyncedAt);
    if (syncedAt) note.driveSyncedAt = syncedAt;
    return note;
}

function notesFromSnapshot(snapshot: any, userId: string): UserNote[] {
    const data = snapshot.data();
    const notes = Array.isArray(data?.notes) ? data.notes : [];
    return notes.map((note: any) => normalizeNote(note, userId)).filter(Boolean) as UserNote[];
}

/** Lists the user's notes, most recent first. Reads the server first, then
 * falls back to the local cache so a just-created note is visible instantly. */
export async function listUserNotes(userId: string): Promise<UserNote[]> {
    const sessionRef = doc(getDb(), USER_NOTES_COLLECTION, userId);
    let snapshot = await getDoc(sessionRef);
    if (!snapshot.exists()) {
        try {
            snapshot = await getDocFromCache(sessionRef);
        } catch {
            return [];
        }
    }
    if (!snapshot.exists()) return [];
    const notes = notesFromSnapshot(snapshot, userId);
    return notes.sort((a, b) => toTime(b.updatedAt ?? b.createdAt) - toTime(a.updatedAt ?? a.createdAt));
}

/** Strict server-source read of a single note — used to confirm writes
 * before navigating anywhere. */
export async function getUserNoteFromServer(userId: string, noteId: string): Promise<UserNote | null> {
    const snapshot = await getDoc(doc(getDb(), USER_NOTES_COLLECTION, userId));
    if (!snapshot.exists()) return null;
    return notesFromSnapshot(snapshot, userId).find((note) => note.id === noteId) ?? null;
}

/** Reads a single note: server first, then local cache. */
export async function getUserNote(userId: string, noteId: string): Promise<UserNote | null> {
    const sessionRef = doc(getDb(), USER_NOTES_COLLECTION, userId);
    let snapshot = await getDoc(sessionRef);
    if (!snapshot.exists()) {
        try {
            snapshot = await getDocFromCache(sessionRef);
        } catch {
            return null;
        }
    }
    if (!snapshot.exists()) return null;
    return notesFromSnapshot(snapshot, userId).find((note) => note.id === noteId) ?? null;
}

/** Upserts a note (create or update). The title derives from the content
 * when left blank, exactly like Co-Pilot chat titles. */
export async function saveUserNote(userId: string, note: UserNote): Promise<void> {
    const sessionRef = doc(getDb(), USER_NOTES_COLLECTION, userId);
    const snapshot = await getDoc(sessionRef);
    const existing = snapshot.exists() ? notesFromSnapshot(snapshot, userId) : [];

    const normalized: UserNote = {
        ...note,
        userId,
        title: note.title?.trim() || deriveNoteTitle(note.content),
        content: typeof note.content === 'string' ? note.content : '',
        updatedAt: new Date(),
    };

    const nextNotes = existing.some((item) => item.id === normalized.id)
        ? existing.map((item) => (item.id === normalized.id ? normalized : item))
        : [normalized, ...existing];

    await setDoc(
        sessionRef,
        {
            userId,
            notes: nextNotes,
            createdAt: (snapshot.exists() ? toDate(snapshot.data()?.createdAt) : undefined) || serverTimestamp(),
            updatedAt: serverTimestamp(),
        },
        { merge: true }
    );
}

export async function renameUserNote(userId: string, noteId: string, title: string): Promise<void> {
    const sessionRef = doc(getDb(), USER_NOTES_COLLECTION, userId);
    const snapshot = await getDoc(sessionRef);
    if (!snapshot.exists()) return;
    const notes = notesFromSnapshot(snapshot, userId);
    const nextNotes = notes.map((note) =>
        note.id === noteId
            ? { ...note, title: title.trim() || deriveNoteTitle(note.content), updatedAt: new Date() }
            : note
    );
    await setDoc(
        sessionRef,
        { userId, notes: nextNotes, updatedAt: serverTimestamp() },
        { merge: true }
    );
}

export async function deleteUserNotes(userId: string, noteIds: string[]): Promise<void> {
    if (noteIds.length === 0) return;
    const sessionRef = doc(getDb(), USER_NOTES_COLLECTION, userId);
    const snapshot = await getDoc(sessionRef);
    if (!snapshot.exists()) return;
    const notes = notesFromSnapshot(snapshot, userId);
    const idSet = new Set(noteIds);
    await setDoc(
        sessionRef,
        { userId, notes: notes.filter((note) => !idSet.has(note.id)), updatedAt: serverTimestamp() },
        { merge: true }
    );
}

export async function deleteUserNote(userId: string, noteId: string): Promise<void> {
    return deleteUserNotes(userId, [noteId]);
}