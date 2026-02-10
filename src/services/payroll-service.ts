'use client';

import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';

export interface Worker {
    id: string;
    name: string;
    email: string;
    sin?: string;
    workerIdNumber?: string; // Unique identifier for company tracking
    workerType: 'employee' | 'contractor';
    payType: 'hourly' | 'salary';
    payRate: number;
    address?: string;
    homePhone?: string;
    cellPhone?: string;
    hireDate?: Date | null;
    startDate?: Date | null;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    hasContract?: boolean;
    specialNeeds?: string;
    notes?: string;
    userId: string;
}

const WORKERS_COLLECTION = 'payrollWorkers';
const REMITTANCES_COLLECTION = 'payrollRemittances';
const PAYROLL_RUNS_COLLECTION = 'payrollRuns';
const TIME_LOGS_COLLECTION = 'timeLogs';
const LEAVE_REQUESTS_COLLECTION = 'leaveRequests';

function getDb() {
    const { db } = getFirebaseServices();
    return db;
}

// --- Worker Types & Functions ---
const docToWorker = (doc: any): Worker => {
    const data = doc.data();

    const toDate = (dateValue: any): Date | null => {
        if (!dateValue) return null;
        if (dateValue.toDate) {
            return dateValue.toDate();
        }
        if (dateValue instanceof Date) {
            return dateValue;
        }
        if (typeof dateValue === 'string') {
            const parsedDate = new Date(dateValue);
            if (!isNaN(parsedDate.getTime())) {
                return parsedDate;
            }
        }
        return null;
    };

    return {
        id: doc.id,
        ...data,
        hireDate: toDate(data.hireDate),
        startDate: toDate(data.startDate),
    } as Worker;
};

export async function getWorkers(userId: string): Promise<Worker[]> {
  const db = getDb();
  // Simplified query to avoid index issues; sorting is handled on the client.
  const q = query(collection(db, WORKERS_COLLECTION), where("userId", "==", userId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return [];
  }
    
  return snapshot.docs.map(docToWorker).sort((a,b) => a.name.localeCompare(b.name));
}

export async function getEmployees(userId: string): Promise<Worker[]> {
  return getWorkers(userId);
}

export async function addWorker(data: Omit<Worker, 'id'>): Promise<Worker> {
    const db = getDb();
    const docRef = await addDoc(collection(db, WORKERS_COLLECTION), data);
    return { id: docRef.id, ...data };
}

export async function updateWorker(id: string, data: Partial<Omit<Worker, 'id' | 'userId'>>): Promise<void> {
    const db = getDb();
    await updateDoc(doc(db, WORKERS_COLLECTION, id), data);
}

export async function deleteWorker(id: string): Promise<void> {
    const db = getDb();
    await deleteDoc(doc(db, WORKERS_COLLECTION, id));
}

export async function deleteWorkers(workerIds: string[]): Promise<void> {
    const db = getDb();
    if (workerIds.length === 0) return;
    const batch = writeBatch(db);
    workerIds.forEach(id => {
        const docRef = doc(db, WORKERS_COLLECTION, id);
        batch.delete(docRef);
    });
    await batch.commit();
}

export async function mergeWorkers(sourceWorkerId: string, masterWorkerId: string): Promise<void> {
    const db = getDb();
    const batch = writeBatch(db);

    const timeLogsQuery = query(collection(db, TIME_LOGS_COLLECTION), where('workerId', '==', sourceWorkerId));
    const timeLogsSnapshot = await getDocs(timeLogsQuery);
    timeLogsSnapshot.forEach(doc => {
        batch.update(doc.ref, { workerId: masterWorkerId });
    });
    
    const leaveRequestsQuery = query(collection(db, LEAVE_REQUESTS_COLLECTION), where('workerId', '==', sourceWorkerId));
    const leaveRequestsSnapshot = await getDocs(leaveRequestsQuery);
    leaveRequestsSnapshot.forEach(doc => {
        batch.update(doc.ref, { workerId: masterWorkerId });
    });

    const sourceWorkerRef = doc(db, WORKERS_COLLECTION, sourceWorkerId);
    batch.delete(sourceWorkerRef);
    
    await batch.commit();
}

// --- Payroll Remittance Types & Functions ---
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

const docToRemittance = (doc: any): PayrollRemittance => ({ id: doc.id, ...doc.data() } as PayrollRemittance);

export async function getRemittances(userId: string): Promise<PayrollRemittance[]> {
    const db = getDb();
    const q = query(collection(db, REMITTANCES_COLLECTION), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToRemittance).sort((a,b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
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

// --- Payroll Run Types & Functions ---

interface PayrollRunDetail {
    employeeId: string;
    employeeName: string;
    grossPay: number;
    deductions: number;
    netPay: number;
}

interface SavePayrollRunData {
    userId: string;
    payPeriodStart: Date;
    payPeriodEnd: Date;
    payDate: Date;
    totalGrossPay: number;
    totalDeductions: number;
    totalNetPay: number;
    employeeCount: number;
    details: PayrollRunDetail[];
}

export async function savePayrollRun(data: SavePayrollRunData): Promise<void> {
    const db = getDb();
    const batch = writeBatch(db);

    const runRef = doc(collection(db, PAYROLL_RUNS_COLLECTION));
    const runData = {
        userId: data.userId,
        payPeriodStart: data.payPeriodStart,
        payPeriodEnd: data.payPeriodEnd,
        payDate: data.payDate,
        totalGrossPay: data.totalGrossPay,
        totalDeductions: data.totalDeductions,
        totalNetPay: data.totalNetPay,
        employeeCount: data.employeeCount,
    };
    batch.set(runRef, runData);

    data.details.forEach(detail => {
        const detailRef = doc(collection(db, PAYROLL_RUNS_COLLECTION, runRef.id, 'details'));
        batch.set(detailRef, { ...detail, runId: runRef.id });
    });

    data.details.forEach(detail => {
        const expenseRef = doc(collection(db, 'expenseTransactions'));
        batch.set(expenseRef, {
            userId: data.userId,
            date: data.payDate.toISOString().split('T')[0],
            company: detail.employeeName,
            description: `Payroll for period ${data.payPeriodStart.toISOString().split('T')[0]} to ${data.payPeriodEnd.toISOString().split('T')[0]}`,
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
