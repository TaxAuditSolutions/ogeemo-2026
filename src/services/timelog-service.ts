
'use client';

import {
  getFirestore,
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { initializeFirebase } from '@/lib/firebase';

export interface TimeLog {
  id: string;
  workerId: string;
  workerName: string;
  startTime: Date;
  endTime: Date;
  durationSeconds: number;
  notes: string;
  userId: string;
}

const TIME_LOGS_COLLECTION = 'timeLogs';

async function getDb() {
  const { db } = await initializeFirebase();
  return db;
}

const docToTimeLog = (doc: any): TimeLog => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    startTime: (data.startTime as Timestamp)?.toDate(),
    endTime: (data.endTime as Timestamp)?.toDate(),
  } as TimeLog;
};

export async function getTimeLogs(userId: string): Promise<TimeLog[]> {
  const db = await getDb();
  const q = query(collection(db, TIME_LOGS_COLLECTION), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToTimeLog).sort((a, b) => b.endTime.getTime() - a.endTime.getTime());
}

export async function addTimeLog(data: Omit<TimeLog, 'id'>): Promise<TimeLog> {
  const db = await getDb();
  const docRef = await addDoc(collection(db, TIME_LOGS_COLLECTION), data);
  return { id: docRef.id, ...data };
}

export async function updateTimeLog(id: string, data: Partial<Omit<TimeLog, 'id' | 'userId'>>): Promise<void> {
    const db = await getDb();
    const docRef = doc(db, TIME_LOGS_COLLECTION, id);
    await updateDoc(docRef, data);
}

