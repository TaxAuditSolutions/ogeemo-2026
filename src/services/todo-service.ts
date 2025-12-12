
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
import { initializeFirebase } from '@/lib/firebase';

export interface ToDoItem {
  id: string;
  text: string;
  userId: string;
  createdAt: Date;
  completed: boolean;
}

const TODOS_COLLECTION = 'todos';

async function getDb() {
    const { db } = await initializeFirebase();
    return db;
}

const docToTodo = (doc: any): ToDoItem => {
    const data = doc.data();
    return {
        id: doc.id,
        text: data.text,
        userId: data.userId,
        createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
        completed: data.completed || false,
    } as ToDoItem;
};


export async function getTodos(userId: string): Promise<ToDoItem[]> {
    const db = await getDb();
    const q = query(
        collection(db, TODOS_COLLECTION), 
        where("userId", "==", userId)
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(docToTodo);
}

export async function addTodo(todoData: Omit<ToDoItem, 'id'>): Promise<ToDoItem> {
    const db = await getDb();
    const docRef = await addDoc(collection(db, TODOS_COLLECTION), { ...todoData, completed: false });
    return { id: docRef.id, ...todoData, completed: false };
}

export async function updateTodo(todoId: string, dataToUpdate: Partial<Omit<ToDoItem, 'id' | 'userId' | 'createdAt'>>): Promise<void> {
    const db = await getDb();
    const todoRef = doc(db, TODOS_COLLECTION, todoId);
    await updateDoc(todoRef, dataToUpdate);
}

export async function deleteTodo(todoId: string): Promise<void> {
    const db = await getDb();
    await deleteDoc(doc(db, TODOS_COLLECTION, todoId));
}

export async function deleteTodos(todoIds: string[]): Promise<void> {
    const db = await getDb();
    if (todoIds.length === 0) return;
    const batch = writeBatch(db);
    todoIds.forEach(id => {
        const docRef = doc(db, TODOS_COLLECTION, id);
        batch.delete(docRef);
    });
    await batch.commit();
}

export async function updateTodosStatus(todoIds: string[], completed: boolean): Promise<void> {
    const db = await getDb();
    if (todoIds.length === 0) return;
    const batch = writeBatch(db);
    todoIds.forEach(id => {
        const docRef = doc(db, TODOS_COLLECTION, id);
        batch.update(docRef, { completed });
    });
    await batch.commit();
}
