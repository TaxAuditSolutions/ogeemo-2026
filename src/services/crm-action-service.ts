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
import { initializeFirebase } from '@/lib/firebase';

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

export async function addAction(data: Omit<Action, 'id'>): Promise<Action> {
  const db = await getDb();
  const docRef = await addDoc(collection(db, CRM_ACTIONS_COLLECTION), data);
  return { id: docRef.id, ...data };
}

export async function updateAction(id: string, data: Partial<Omit<Action, 'id' | 'userId'>>): Promise<void> {
  const db = await getDb();
  await updateDoc(doc(db, CRM_ACTIONS_COLLECTION, id), data);
}

export async function deleteAction(id: string): Promise<void> {
  const db = await getDb();
  await deleteDoc(doc(db, CRM_ACTIONS_COLLECTION, id));
}

export async function updateActionPositions(updates: { id: string; position: number; status: string }[]): Promise<void> {
  const db = await getDb();
  const batch = writeBatch(db);
  updates.forEach(update => {
    const docRef = doc(db, CRM_ACTIONS_COLLECTION, update.id);
    batch.update(docRef, { position: update.position, status: update.status });
  });
  await batch.commit();
}
