
'use client';

import {
  getFirestore,
  collection,
  getDocs,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { type Event as TaskEvent } from '@/types/calendar-types';
import { archiveTaskAsFile } from './file-service';


const TASKS_COLLECTION = 'tasks';

async function getDb() {
    const { db } = await initializeFirebase();
    return db;
}

const docToTodo = (doc: any): TaskEvent => {
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
        completed: data.completed || false,
    } as TaskEvent;
};


export async function getTodos(userId: string): Promise<TaskEvent[]> {
    const db = await getDb();
    const q = query(
        collection(db, TASKS_COLLECTION), 
        where("userId", "==", userId)
    );
    const snapshot = await getDocs(q);
    
    // This is now the single source of truth for what a "To-Do" is.
    return snapshot.docs
        .map(docToTodo)
        .filter(task => !task.projectId || task.projectId === 'inbox');
}

export async function addTodo(todoData: Omit<TaskEvent, 'id'>): Promise<TaskEvent> {
    const db = await getDb();
    // Ensure it's treated as a general "to-do" by not having a project ID
    const dataToSave = {
        ...todoData,
        status: 'todo' as const,
        projectId: null,
        position: todoData.position || 0,
    };
    const docRef = await addDoc(collection(db, TASKS_COLLECTION), dataToSave);
    return { id: docRef.id, ...dataToSave };
}

export async function updateTodo(todoId: string, dataToUpdate: Partial<Omit<TaskEvent, 'id' | 'userId' | 'createdAt'>>): Promise<void> {
    const db = await getDb();
    const todoRef = doc(db, TASKS_COLLECTION, todoId);
    await updateDoc(todoRef, dataToUpdate);
}

export async function deleteTodo(todoId: string): Promise<void> {
    const db = await getDb();
    await deleteDoc(doc(db, TASKS_COLLECTION, todoId));
}

export async function deleteTodos(todoIds: string[]): Promise<void> {
    const db = await getDb();
    if (todoIds.length === 0) return;
    const batch = writeBatch(db);
    todoIds.forEach(id => {
        const docRef = doc(db, TASKS_COLLECTION, id);
        batch.delete(docRef);
    });
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

export async function updateTodosStatus(todoIds: string[], completed: boolean): Promise<void> {
    const db = await getDb();
    if (todoIds.length === 0) return;
    const batch = writeBatch(db);
    const status = completed ? 'done' : 'todo';
    todoIds.forEach(id => {
        const docRef = doc(db, TASKS_COLLECTION, id);
        batch.update(docRef, { completed, status });
    });
    await batch.commit();
}
