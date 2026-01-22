
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
import { getFirebaseServices } from '@/firebase';
import { type Event as TaskEvent } from '@/types/calendar-types';
import { archiveTaskAsFile } from './file-service';


const TASKS_COLLECTION = 'tasks';

function getDb() {
    const { db } = getFirebaseServices();
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
    const db = getDb();
    // A "To-Do" is now defined as any task not assigned to a project.
    const q = query(
        collection(db, TASKS_COLLECTION), 
        where("userId", "==", userId),
        where("projectId", "==", null)
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(docToTodo);
}

export async function addTodo(todoData: Omit<TaskEvent, 'id'>): Promise<TaskEvent> {
    const db = getDb();
    // Ensure it's treated as a general "to-do" by not having a project ID
    const dataToSave = {
        ...todoData,
        status: 'todo' as const,
        projectId: null,
        position: todoData.position || 0,
        isTodoItem: true, // Keep this flag for potential backward compatibility or future filtering
    };
    const docRef = await addDoc(collection(db, TASKS_COLLECTION), dataToSave);
    return { id: docRef.id, ...dataToSave };
}

export async function updateTodo(todoId: string, dataToUpdate: Partial<Omit<TaskEvent, 'id' | 'userId' | 'createdAt'>>): Promise<void> {
    const db = getDb();
    const todoRef = doc(db, TASKS_COLLECTION, todoId);
    await updateDoc(todoRef, dataToUpdate);
}

export async function deleteTodo(todoId: string): Promise<void> {
    const db = getDb();
    await deleteDoc(doc(db, TASKS_COLLECTION, todoId));
}

export async function deleteTodos(todoIds: string[]): Promise<void> {
    const db = getDb();
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

export async function updateTodoPositions(updates: { id: string; position: number; status: string }[]): Promise<void> {
  const db = getDb();
  const batch = writeBatch(db);
  updates.forEach(update => {
    const docRef = doc(db, TASKS_COLLECTION, update.id);
    batch.update(docRef, { position: update.position, status: update.status });
  });
  await batch.commit();
}

export async function updateTodosStatus(todoIds: string[], completed: boolean): Promise<void> {
    const db = getDb();
    if (todoIds.length === 0) return;
    const batch = writeBatch(db);
    const status = completed ? 'done' : 'todo';
    todoIds.forEach(id => {
        const docRef = doc(db, TASKS_COLLECTION, id);
        batch.update(docRef, { completed, status });
    });
    await batch.commit();
}
