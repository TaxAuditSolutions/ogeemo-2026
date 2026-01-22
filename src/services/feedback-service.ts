
'use client';

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
} from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';

export interface FeedbackData {
  id?: string;
  type: 'bug' | 'feature' | 'general';
  feedback: string;
  reporterName: string;
  topic: string;
  date: string;
  userId?: string; // Optional for now
}

const FEEDBACK_COLLECTION = 'feedback';

function getDb() {
  const { db } = getFirebaseServices();
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  return db;
}

const docToFeedback = (doc: any): FeedbackData => {
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
    } as FeedbackData;
};


export async function submitFeedback(data: Omit<FeedbackData, 'id'>): Promise<{ success: true }> {
    const db = getDb();
    await addDoc(collection(db, FEEDBACK_COLLECTION), data);
    return { success: true };
}

export async function getFeedback(): Promise<FeedbackData[]> {
    const db = getDb();
    const q = query(collection(db, FEEDBACK_COLLECTION));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToFeedback).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
