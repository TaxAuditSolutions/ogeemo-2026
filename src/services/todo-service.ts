
'use client';

import {
    collection,
    getDocs,
    getDoc,
    doc,
    addDoc,
    deleteDoc,
    updateDoc,
    query,
    where,
    Timestamp,
    writeBatch,
} from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';
import { type Event as TaskEvent } from '@/types/calendar-types';
import { archiveTaskAsFile } from '@/core/file-service';


const TASKS_COLLECTION = 'tasks';

function getDb() {
    const { db } = getFirebaseServices();
    return db;
}

function getCurrentAuthContext() {
    const { auth } = getFirebaseServices();
    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error('User must be logged in.');
    }
    return currentUser;
}

async function getCurrentOrgId(): Promise<string> {
    const currentUser = getCurrentAuthContext();
    const tokenResult = await currentUser.getIdTokenResult();
    const orgId = tokenResult.claims.orgId;
    if (typeof orgId !== 'string' || !orgId.trim()) {
        throw new Error('Authenticated user is missing an orgId claim.');
    }
    return orgId;
}

function toClientDate(value: any): Date | undefined {
    if (!value) return undefined;
    if (value instanceof Timestamp) return value.toDate();
    if (value instanceof Date) return value;
    if (typeof value?.toDate === 'function') return value.toDate();
    return undefined;
}

function toFirestoreDateValue(value: any): Date | null {
    if (value === null) return null;
    if (!value) return null;
    if (value instanceof Timestamp) return value.toDate();
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
}

const docToTodo = (doc: any): TaskEvent => {
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        start: toClientDate(data.start),
        end: toClientDate(data.end),
        createdAt: toClientDate(data.createdAt),
        updatedAt: toClientDate(data.updatedAt),
        completed: data.completed || false,
    } as TaskEvent;
};


export async function getTodos(userId: string): Promise<TaskEvent[]> {
    const db = getDb();
    const orgId = await getCurrentOrgId();
    // A "To-Do" is now defined as any task not assigned to a project.
    const q = query(
        collection(db, TASKS_COLLECTION),
        where("orgId", "==", orgId),
        where("projectId", "==", null)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(docToTodo);
}

export async function addTodo(todoData: Omit<TaskEvent, 'id'>): Promise<TaskEvent> {
    const db = getDb();
    const currentUser = getCurrentAuthContext();
    const orgId = await getCurrentOrgId();
    // Ensure it's treated as a general "to-do" by not having a project ID
    const dataToSave = {
        ...todoData,
        orgId,
        createdBy: currentUser.uid,
        updatedBy: currentUser.uid,
        createdAt: todoData.createdAt || new Date(),
        updatedAt: new Date(),
        status: 'todo' as const,
        projectId: null,
        start: toFirestoreDateValue(todoData.start),
        end: toFirestoreDateValue(todoData.end),
        position: todoData.position || 0,
        isTodoItem: true, // Keep this flag for potential backward compatibility or future filtering
    };
    const docRef = await addDoc(collection(db, TASKS_COLLECTION), dataToSave);
    return docToTodo({ id: docRef.id, data: () => dataToSave });
}

export async function updateTodo(todoId: string, dataToUpdate: Partial<Omit<TaskEvent, 'id' | 'userId' | 'createdAt'>>): Promise<void> {
    const db = getDb();
    const currentUser = getCurrentAuthContext();
    const orgId = await getCurrentOrgId();
    const todoRef = doc(db, TASKS_COLLECTION, todoId);
    const todoSnap = await getDoc(todoRef);
    if (!todoSnap.exists() || todoSnap.data().orgId !== orgId) return;

    const updatedData: any = {
        ...dataToUpdate,
        orgId,
        updatedBy: currentUser.uid,
        updatedAt: new Date(),
    };
    if ('start' in updatedData) {
        updatedData.start = toFirestoreDateValue(updatedData.start);
    }
    if ('end' in updatedData) {
        updatedData.end = toFirestoreDateValue(updatedData.end);
    }

    await updateDoc(todoRef, updatedData);
}

export async function deleteTodo(todoId: string): Promise<void> {
    const db = getDb();
    const orgId = await getCurrentOrgId();
    const todoRef = doc(db, TASKS_COLLECTION, todoId);
    const snap = await getDoc(todoRef);
    if (!snap.exists() || snap.data().orgId !== orgId) return;
    await deleteDoc(todoRef);
}

export async function deleteTodos(todoIds: string[]): Promise<void> {
    const db = getDb();
    if (todoIds.length === 0) return;
    const orgId = await getCurrentOrgId();
    const batch = writeBatch(db);
    for (const id of todoIds) {
        const docRef = doc(db, TASKS_COLLECTION, id);
        const snap = await getDoc(docRef);
        if (snap.exists() && snap.data().orgId === orgId) {
            batch.delete(docRef);
        }
    }
    await batch.commit();
}

export async function archiveTodos(userId: string, tasksToArchive: TaskEvent[]): Promise<void> {
    if (tasksToArchive.length === 0) return;

    // Archive each file
    for (const task of tasksToArchive) {
        await archiveTaskAsFile(userId, task);
    }

    // Then bulk delete from the tasks collection
    await deleteTodos(tasksToArchive.map(t => t.id));
}

export async function updateTodoPositions(updates: { id: string; position: number; status: string }[]): Promise<void> {
    const db = getDb();
    const currentUser = getCurrentAuthContext();
    const orgId = await getCurrentOrgId();
    const batch = writeBatch(db);
    for (const update of updates) {
        const docRef = doc(db, TASKS_COLLECTION, update.id);
        const snap = await getDoc(docRef);
        if (snap.exists() && snap.data().orgId === orgId) {
            batch.update(docRef, { position: update.position, status: update.status, updatedBy: currentUser.uid, updatedAt: new Date() });
        }
    }
    await batch.commit();
}

export async function updateTodosStatus(todoIds: string[], completed: boolean): Promise<void> {
    const db = getDb();
    if (todoIds.length === 0) return;
    const currentUser = getCurrentAuthContext();
    const orgId = await getCurrentOrgId();
    const batch = writeBatch(db);
    const status = completed ? 'done' : 'todo';
    for (const id of todoIds) {
        const docRef = doc(db, TASKS_COLLECTION, id);
        const snap = await getDoc(docRef);
        if (snap.exists() && snap.data().orgId === orgId) {
            batch.update(docRef, { completed, status, updatedBy: currentUser.uid, updatedAt: new Date() });
        }
    }
    await batch.commit();
}
