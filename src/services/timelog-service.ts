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
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';

export interface TimeLog {
  id: string;
  workerId: string;
  workerName: string;
  startTime: Date;
  endTime: Date;
  durationSeconds: number;
  location?: string;
  subject?: string;
  notes: string;
  userId: string;
  status: 'unprocessed' | 'processed' | 'ready-for-payroll';
  isBillable?: boolean;
  billableRate?: number;
}

const TIME_LOGS_COLLECTION = 'timeLogs';

function getDb() {
  const { db } = getFirebaseServices();
  return db;
}

const docToTimeLog = (doc: any): TimeLog => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    startTime: (data.startTime as Timestamp)?.toDate(),
    endTime: (data.endTime as Timestamp)?.toDate(),
    status: data.status || 'unprocessed',
    isBillable: data.isBillable || false,
    billableRate: data.billableRate || 0,
    subject: data.subject || '',
  } as TimeLog;
};

export async function getTimeLogs(userId: string): Promise<TimeLog[]> {
  const db = getDb();
  const q = query(collection(db, TIME_LOGS_COLLECTION), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToTimeLog).sort((a, b) => b.endTime.getTime() - a.endTime.getTime());
}

export async function addTimeLog(data: Omit<TimeLog, 'id'>): Promise<TimeLog> {
    const db = getDb();
    const collectionRef = collection(db, TIME_LOGS_COLLECTION);
    const dataToSave = {
        ...data,
        status: data.status || 'unprocessed',
    };
    const docRef = await addDoc(collectionRef, dataToSave);
    return { id: docRef.id, ...dataToSave };
}

export async function updateTimeLog(id: string, data: Partial<Omit<TimeLog, 'id' | 'userId'>>): Promise<void> {
    const db = getDb();
    const docRef = doc(db, TIME_LOGS_COLLECTION, id);
    await updateDoc(docRef, data);
}

export async function deleteTimeLog(id: string): Promise<void> {
    const db = getDb();
    const docRef = doc(db, TIME_LOGS_COLLECTION, id);
    await deleteDoc(docRef);
}

export async function updateTimeLogsStatus(logIds: string[], status: TimeLog['status']): Promise<void> {
    if (logIds.length === 0) {
        return;
    }
    const db = getDb();
    const batch = writeBatch(db);
    logIds.forEach(id => {
        const docRef = doc(db, TIME_LOGS_COLLECTION, id);
        batch.update(docRef, { status: status });
    });
    
    await batch.commit();
}
