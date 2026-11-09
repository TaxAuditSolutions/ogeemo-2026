
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
import { billedDeleteProblem, billedUpdateProblem, timeLogProblem } from '@/lib/time-entry-lock';

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
  // Billing state (OG-070): set when this record is placed on an invoice,
  // cleared when that invoice is deleted or the entry is removed from it.
  billedInvoiceId?: string | null;
  billedAt?: Date | null;
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
  let tokenResult;
  try {
    tokenResult = await currentUser.getIdTokenResult();
  } catch (error) {
    console.warn('Time log service: unable to read auth claims; falling back to user profile org lookup.', error);
  }
  const orgId = tokenResult?.claims?.orgId;

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
    billedInvoiceId: data.billedInvoiceId || null,
    billedAt: (data.billedAt as Timestamp)?.toDate() ?? data.billedAt ?? null,
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
  const problem = timeLogProblem(data);
  if (problem) throw new Error(problem);
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
  const blocked = billedUpdateProblem(snapshot.data(), data, 'time log');
  if (blocked) throw new Error(blocked);
  const problem = timeLogProblem(data, snapshot.data());
  if (problem) throw new Error(problem);

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
  // An invoiced log is the record the invoice line points back at; deleting it breaks the audit trail.
  const blocked = billedDeleteProblem(snapshot.data(), 'time log');
  if (blocked) throw new Error(blocked);

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
  // Only this workspace's logs: an id from anywhere else is skipped, not written.
  for (const id of logIds) {
    const logRef = doc(db, TIME_LOGS_COLLECTION, id);
    const snapshot = await getDoc(logRef);
    if (snapshot.exists() && snapshot.data()?.orgId === orgId) {
      batch.update(logRef, { status, updatedBy: currentUser.uid, updatedAt: new Date() });
    }
  }
  await batch.commit();
}
