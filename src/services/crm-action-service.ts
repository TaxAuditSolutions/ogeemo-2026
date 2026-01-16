
'use client';

import {
  getFirestore,
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export interface Action {
  id: string;
  title: string;
  description?: string;
  status: 'To Do' | 'In Progress' | 'Done';
  position: number;
  leadName: string;
  userId: string;
}

const CRM_ACTIONS_COLLECTION = 'crmActions';

async function getDb() {
  const { db } = await initializeFirebase();
  return db;
}

const docToAction = (doc: any): Action => ({
  id: doc.id,
  ...doc.data(),
} as Action);

export async function getAllCrmActions(userId: string): Promise<Action[]> {
  const db = await getDb();
  const q = query(
    collection(db, CRM_ACTIONS_COLLECTION),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToAction);
}


export async function getActionsForLead(userId: string, leadName: string): Promise<Action[]> {
  const db = await getDb();
  const q = query(
    collection(db, CRM_ACTIONS_COLLECTION),
    where('userId', '==', userId),
    where('leadName', '==', leadName)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToAction).sort((a, b) => a.position - b.position);
}

export function addAction(data: Omit<Action, 'id'>): Promise<Action> {
  return new Promise(async (resolve, reject) => {
    const db = await getDb();
    const collectionRef = collection(db, CRM_ACTIONS_COLLECTION);
    
    addDoc(collectionRef, data)
      .then(docRef => resolve({ id: docRef.id, ...data }))
      .catch(serverError => {
        const permissionError = new FirestorePermissionError({
            path: collectionRef.path,
            operation: 'create',
            requestResourceData: data,
        });
        errorEmitter.emit('permission-error', permissionError);
        reject(serverError);
      });
  });
}

export function updateAction(id: string, data: Partial<Omit<Action, 'id' | 'userId'>>): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const db = await getDb();
    const docRef = doc(db, CRM_ACTIONS_COLLECTION, id);
    
    updateDoc(docRef, data)
      .then(resolve)
      .catch(serverError => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: data,
        });
        errorEmitter.emit('permission-error', permissionError);
        reject(serverError);
      });
  });
}

export function deleteAction(id: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const db = await getDb();
    const docRef = doc(db, CRM_ACTIONS_COLLECTION, id);
    
    deleteDoc(docRef)
      .then(resolve)
      .catch(serverError => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        reject(serverError);
      });
  });
}

export function updateActionPositions(updates: { id: string; position: number; status: string }[]): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const db = await getDb();
    const batch = writeBatch(db);
    updates.forEach(update => {
        const docRef = doc(db, CRM_ACTIONS_COLLECTION, update.id);
        batch.update(docRef, { position: update.position, status: update.status });
    });
    
    batch.commit()
      .then(resolve)
      .catch(serverError => {
        const permissionError = new FirestorePermissionError({
            path: CRM_ACTIONS_COLLECTION,
            operation: 'update',
            requestResourceData: { batch: updates },
        });
        errorEmitter.emit('permission-error', permissionError);
        reject(serverError);
      });
  });
}
