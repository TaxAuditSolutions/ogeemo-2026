
'use client';

import {
  collection,
  getDocs,
  getDoc,
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
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export interface TimeLog {
  id: string;
  workerId: string;
  workerName: string;
  contactId?: string | null;
  contactName?: string | null;
  startTime: Date;
  endTime: Date;
  durationSeconds: number;
  location?: string;
  subject?: string;
  notes: string;
  userId: string;
  orgId?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  status: 'unprocessed' | 'processed' | 'ready-for-payroll';
  isBillable?: boolean;
  billableRate?: number;
}

const TIME_LOGS_COLLECTION = 'timeLogs';

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
  const tokenResult = await currentUser.getIdTokenResult(true);
  const orgId = tokenResult.claims.orgId;

  if (typeof orgId !== 'string' || !orgId.trim()) {
    throw new Error('Authenticated user is missing an orgId claim.');
  }

  return orgId;
}

const docToTimeLog = (doc: any): TimeLog => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    startTime: (data.startTime as Timestamp)?.toDate(),
    endTime: (data.endTime as Timestamp)?.toDate(),
    createdAt: (data.createdAt as Timestamp)?.toDate() ?? data.createdAt,
    updatedAt: (data.updatedAt as Timestamp)?.toDate() ?? data.updatedAt,
    status: data.status || 'unprocessed',
    isBillable: data.isBillable || false,
    billableRate: data.billableRate || 0,
    subject: data.subject || '',
    contactId: data.contactId || null,
    contactName: data.contactName || null,
  } as TimeLog;
};

/**
 * Fetches time logs scoped to the current user's organization.
 */
export async function getTimeLogs(userId?: string): Promise<TimeLog[]> {
  const db = getDb();
  const orgId = await getCurrentOrgId();
  const q = query(collection(db, TIME_LOGS_COLLECTION), where("orgId", "==", orgId));

  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToTimeLog).sort((a, b) => b.endTime.getTime() - a.endTime.getTime());
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: TIME_LOGS_COLLECTION,
        operation: 'list',
      } satisfies SecurityRuleContext));
    }
    throw error;
  }
}

export async function addTimeLog(data: Omit<TimeLog, 'id'>): Promise<TimeLog> {
  const db = getDb();
  const orgId = await getCurrentOrgId();
  const currentUser = getCurrentAuthContext();
  const now = new Date();
  const dataToSave = {
    ...data,
    orgId,
    createdBy: currentUser.uid,
    updatedBy: currentUser.uid,
    createdAt: now,
    updatedAt: now,
    status: data.status || 'unprocessed',
  };
  const docRef = await addDoc(collection(db, TIME_LOGS_COLLECTION), dataToSave);
  return { id: docRef.id, ...dataToSave };
}

export async function updateTimeLog(id: string, data: Partial<Omit<TimeLog, 'id' | 'userId'>>): Promise<void> {
  const db = getDb();
  const orgId = await getCurrentOrgId();
  const currentUser = getCurrentAuthContext();
  const logRef = doc(db, TIME_LOGS_COLLECTION, id);
  const snapshot = await getDoc(logRef);

  if (!snapshot.exists() || snapshot.data()?.orgId !== orgId) {
    throw new Error('Time log not found for the current organization.');
  }

  await updateDoc(logRef, {
    ...data,
    updatedBy: currentUser.uid,
    updatedAt: new Date(),
  });
}

export async function deleteTimeLog(id: string): Promise<void> {
  const db = getDb();
  const orgId = await getCurrentOrgId();
  const logRef = doc(db, TIME_LOGS_COLLECTION, id);
  const snapshot = await getDoc(logRef);

  if (!snapshot.exists() || snapshot.data()?.orgId !== orgId) {
    throw new Error('Time log not found for the current organization.');
  }

  await deleteDoc(logRef);
}

export async function updateTimeLogsStatus(logIds: string[], status: TimeLog['status']): Promise<void> {
  if (logIds.length === 0) {
    return;
  }
  const db = getDb();
  const orgId = await getCurrentOrgId();
  const currentUser = getCurrentAuthContext();
  const batch = writeBatch(db);
  logIds.forEach(id => {
    const logRef = doc(db, TIME_LOGS_COLLECTION, id);
    batch.update(logRef, { status, updatedBy: currentUser.uid, updatedAt: new Date() });
  });

  await batch.commit();
}
