'use client';

import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';
import { type Contact } from '@/data/contacts';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

/**
 * @fileOverview Refactored Payroll Service for Ogeemo.
 * Consolidates 'Workers' into the Contact Hub as the Single Source of Truth.
 */

export type Worker = Contact;

const CONTACTS_COLLECTION = 'contacts';
const FOLDERS_COLLECTION = 'contactFolders';
const REMITTANCES_COLLECTION = 'payrollRemittances';
const PAYROLL_RUNS_COLLECTION = 'payrollRuns';
const TIME_LOGS_COLLECTION = 'timeLogs';
const LEAVE_REQUESTS_COLLECTION = 'leaveRequests';

function getDb() {
    const { db } = getFirebaseServices();
    return db;
}

const docToWorker = (doc: any): Worker => {
    const data = doc.data();
    return { 
        id: doc.id, 
        ...data,
        payRate: Number(data.payRate) || 0,
    } as Worker;
};

/**
 * Fetches all workers from the Contact Hub based strictly on folder assignment.
 * This adheres to the protocol: If they are in the Workers/Employees/Contractors folders, they are workers.
 * Scoped strictly to the current user to prevent 'IN' comparison limit errors.
 */
export async function getWorkers(userId: string): Promise<Worker[]> {
  const db = getDb();
  
  if (!userId || typeof userId !== 'string') return [];

  try {
    // 1. Resolve the mandated system folder IDs for THIS user only
    const foldersRef = collection(db, FOLDERS_COLLECTION);
    const foldersQuery = query(foldersRef, where("userId", "==", userId));

    const foldersSnapshot = await getDocs(foldersQuery);
    const userFolders = foldersSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
    
    // Find the specific worker-related nodes within the user's taxonomy
    const workerFolderIds = userFolders
        .filter(f => f.isSystem && (
            f.name.toLowerCase() === 'employees' || 
            f.name.toLowerCase() === 'contractors' || 
            f.name.toLowerCase() === 'workers'
        ))
        .map(f => f.id);

    // If no folders found, return empty set to avoid invalid IN query
    if (workerFolderIds.length === 0) return [];

    // 2. Query contacts strictly based on their folder assignment and user ownership
    const contactsRef = collection(db, CONTACTS_COLLECTION);
    // Note: 'in' queries are limited to 30 items. We are scoping strictly to worker folders.
    const q = query(
        contactsRef, 
        where("userId", "==", userId),
        where("folderId", "in", workerFolderIds.slice(0, 30))
    );
    
    const snapshot = await getDocs(q);
    // Explicitly filter for presence of worker metadata to be defensive
    return snapshot.docs
        .map(docToWorker)
        .filter(w => w.workerType !== null && w.workerType !== undefined)
        .sort((a,b) => a.name.localeCompare(b.name));

  } catch (error: any) {
    if (error.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: CONTACTS_COLLECTION,
            operation: 'list',
        } satisfies SecurityRuleContext));
    }
    throw error;
  }
}

export async function addWorker(data: Omit<Worker, 'id'>): Promise<Worker> {
    const db = getDb();
    const docRef = await addDoc(collection(db, CONTACTS_COLLECTION), data);
    return { id: docRef.id, ...data };
}

export async function updateWorker(id: string, data: Partial<Omit<Worker, 'id' | 'userId'>>): Promise<void> {
    const db = getDb();
    await updateDoc(doc(db, CONTACTS_COLLECTION, id), data);
}

export async function deleteWorker(id: string): Promise<void> {
    const db = getDb();
    await deleteDoc(doc(db, CONTACTS_COLLECTION, id));
}

export async function deleteWorkers(workerIds: string[]): Promise<void> {
    const db = getDb();
    if (workerIds.length === 0) return;
    const batch = writeBatch(db);
    workerIds.forEach(id => {
        const docRef = doc(db, CONTACTS_COLLECTION, id);
        batch.delete(docRef);
    });
    await batch.commit();
}

export async function mergeWorkers(sourceWorkerId: string, masterWorkerId: string): Promise<void> {
    const db = getDb();
    const batch = writeBatch(db);

    const timeLogsQuery = query(collection(db, TIME_LOGS_COLLECTION), where('workerId', '==', sourceWorkerId));
    const timeLogsSnapshot = await getDocs(timeLogsQuery);
    timeLogsSnapshot.forEach(doc => batch.update(doc.ref, { workerId: masterWorkerId }));
    
    const leaveRequestsQuery = query(collection(db, LEAVE_REQUESTS_COLLECTION), where('workerId', '==', sourceWorkerId));
    const leaveRequestsSnapshot = await getDocs(leaveRequestsQuery);
    leaveRequestsSnapshot.forEach(doc => batch.update(doc.ref, { workerId: masterWorkerId }));

    batch.delete(doc(db, CONTACTS_COLLECTION, sourceWorkerId));
    await batch.commit();
}

export interface PayrollRemittance {
  id: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  dueDate: string;
  amount: number;
  status: 'Due' | 'Paid';
  paidDate?: string;
  userId: string;
}

export async function getRemittances(userId: string): Promise<PayrollRemittance[]> {
    const db = getDb();
    if (!userId) return [];
    const q = query(collection(db, REMITTANCES_COLLECTION), where("userId", "==", userId));
    try {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)).sort((a,b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: REMITTANCES_COLLECTION,
                operation: 'list',
            } satisfies SecurityRuleContext));
        }
        throw error;
    }
}

export async function addRemittance(data: Omit<PayrollRemittance, 'id'>): Promise<PayrollRemittance> {
    const db = getDb();
    const docRef = await addDoc(collection(db, REMITTANCES_COLLECTION), data);
    return { id: docRef.id, ...data };
}

export async function updateRemittance(id: string, data: Partial<Omit<PayrollRemittance, 'id' | 'userId'>>): Promise<void> {
    const db = getDb();
    await updateDoc(doc(db, REMITTANCES_COLLECTION, id), data);
}

export async function deleteRemittance(id: string): Promise<void> {
    const db = getDb();
    await deleteDoc(doc(db, REMITTANCES_COLLECTION, id));
}

export async function savePayrollRun(data: any): Promise<void> {
    const db = getDb();
    const batch = writeBatch(db);
    const runRef = doc(collection(db, PAYROLL_RUNS_COLLECTION));
    batch.set(runRef, {
        userId: data.userId,
        payPeriodStart: data.payPeriodStart,
        payPeriodEnd: data.payPeriodEnd,
        payDate: data.payDate,
        totalGrossPay: data.totalGrossPay,
        totalDeductions: data.totalDeductions,
        totalNetPay: data.totalNetPay,
        employeeCount: data.employeeCount,
    });

    data.details.forEach((detail: any) => {
        const detailRef = doc(collection(db, PAYROLL_RUNS_COLLECTION, runRef.id, 'details'));
        batch.set(detailRef, { ...detail, runId: runRef.id, userId: data.userId });
        
        const expenseRef = doc(collection(db, 'expenseTransactions'));
        batch.set(expenseRef, {
            userId: data.userId,
            date: data.payDate.toISOString().split('T')[0],
            company: detail.employeeName,
            description: `Payroll for period ${data.payPeriodStart.toISOString().split('T')[0]} - ${data.payPeriodEnd.toISOString().split('T')[0]}`,
            totalAmount: detail.grossPay,
            category: '9060',
            type: 'business',
        });
    });

    if (data.totalDeductions > 0) {
        const remittanceRef = doc(collection(db, REMITTANCES_COLLECTION));
        batch.set(remittanceRef, {
            userId: data.userId,
            payPeriodStart: data.payPeriodStart.toISOString().split('T')[0],
            payPeriodEnd: data.payPeriodEnd.toISOString().split('T')[0],
            dueDate: new Date(data.payDate.getFullYear(), data.payDate.getMonth() + 1, 15).toISOString().split('T')[0],
            amount: data.totalDeductions,
            status: 'Due',
        });
    }
    await batch.commit();
}
