

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
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export interface TimeLog {
  id: string;
  workerId: string;
  workerName: string;
  startTime: Date;
  endTime: Date;
  durationSeconds: number;
  notes: string;
  userId: string;
  status: 'unprocessed' | 'processed' | 'ready-for-payroll';
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
    status: data.status || 'unprocessed', // Default to unprocessed
  } as TimeLog;
};

export async function getTimeLogs(userId: string): Promise<TimeLog[]> {
  const db = getDb();
  const q = query(collection(db, TIME_LOGS_COLLECTION), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToTimeLog).sort((a, b) => b.endTime.getTime() - a.endTime.getTime());
}

export function addTimeLog(data: Omit<TimeLog, 'id'>): Promise<TimeLog> {
  return new Promise(async (resolve, reject) => {
    const db = getDb();
    const collectionRef = collection(db, TIME_LOGS_COLLECTION);
    const dataToSave = {
        ...data,
        status: data.status || 'unprocessed',
    };
    addDoc(collectionRef, dataToSave)
        .then(docRef => resolve({ id: docRef.id, ...dataToSave }))
        .catch(serverError => {
            const permissionError = new FirestorePermissionError({
                path: collectionRef.path,
                operation: 'create',
                requestResourceData: dataToSave,
            });
            errorEmitter.emit('permission-error', permissionError);
            reject(serverError);
        });
  });
}

export function updateTimeLog(id: string, data: Partial<Omit<TimeLog, 'id' | 'userId'>>): Promise<void> {
    return new Promise(async (resolve, reject) => {
        const db = getDb();
        const docRef = doc(db, TIME_LOGS_COLLECTION, id);
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

export function deleteTimeLog(id: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
        const db = getDb();
        const docRef = doc(db, TIME_LOGS_COLLECTION, id);
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

export function updateTimeLogsStatus(logIds: string[], status: TimeLog['status']): Promise<void> {
    return new Promise(async (resolve, reject) => {
        if (logIds.length === 0) {
            resolve();
            return;
        }
        const db = getDb();
        const batch = writeBatch(db);
        logIds.forEach(id => {
            const docRef = doc(db, TIME_LOGS_COLLECTION, id);
            batch.update(docRef, { status: status });
        });
        
        batch.commit()
            .then(resolve)
            .catch(serverError => {
                const permissionError = new FirestorePermissionError({
                    path: TIME_LOGS_COLLECTION,
                    operation: 'update',
                    requestResourceData: { ids: logIds, newStatus: status }
                });
                errorEmitter.emit('permission-error', permissionError);
                reject(serverError);
            });
    });
}
