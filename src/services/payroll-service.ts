
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
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { initializeFirebase } from '@/lib/firebase';
import { type Worker, mockWorkers } from '@/data/payroll';
import { addExpenseTransaction } from './accounting-service';
import { getRemittances as getPayrollRemittances, addRemittance } from './payroll-service';


const WORKERS_COLLECTION = 'payrollWorkers';
const REMITTANCES_COLLECTION = 'payrollRemittances';
const PAYROLL_RUNS_COLLECTION = 'payrollRuns';

async function getDb() {
    const { db } = await initializeFirebase();
    return db;
}

// --- Worker Types & Functions ---
const docToWorker = (doc: any): Worker => {
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        hireDate: data.hireDate ? (data.hireDate as Timestamp).toDate() : null,
        startDate: data.startDate ? (data.startDate as Timestamp).toDate() : null,
    } as Worker;
};

export async function getWorkers(userId: string): Promise<Worker[]> {
  const db = await getDb();
  const q = query(collection(db, WORKERS_COLLECTION), where("userId", "==", userId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    const newWorkers: Worker[] = [];
    for (const worker of mockWorkers) {
        const docRef = await addDoc(collection(db, WORKERS_COLLECTION), { ...worker, userId });
        newWorkers.push({ ...worker, id: docRef.id, userId });
    }
    return newWorkers.sort((a,b) => a.name.localeCompare(b.name));
  }
    
  return snapshot.docs.map(docToWorker).sort((a,b) => a.name.localeCompare(b.name));
}


export async function getEmployees(userId: string): Promise<Worker[]> {
  return getWorkers(userId);
}


export async function addWorker(data: Omit<Worker, 'id'>): Promise<Worker> {
    const db = await getDb();
    const docRef = await addDoc(collection(db, WORKERS_COLLECTION), data);
    return { id: docRef.id, ...data };
}

export async function updateWorker(id: string, data: Partial<Omit<Worker, 'id' | 'userId'>>): Promise<void> {
    const db = await getDb();
    await updateDoc(doc(db, WORKERS_COLLECTION, id), data);
}

export async function deleteWorker(id: string): Promise<void> {
    const db = await getDb();
    await deleteDoc(doc(db, WORKERS_COLLECTION, id));
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
    const db = await getDb();
    const q = query(collection(db, REMITTANCES_COLLECTION), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToRemittance).sort((a,b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
}

export async function updateRemittance(id: string, data: Partial<Omit<PayrollRemittance, 'id' | 'userId'>>): Promise<void> {
    const db = await getDb();
    await updateDoc(doc(db, REMITTANCES_COLLECTION, id), data);
}

export async function deleteRemittance(id: string): Promise<void> {
    const db = await getDb();
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
    const db = await getDb();
    const batch = writeBatch(db);

    // 1. Create the main payroll run document
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

    // 2. Create detail documents for each employee in the run
    data.details.forEach(detail => {
        const detailRef = doc(collection(db, PAYROLL_RUNS_COLLECTION, runRef.id, 'details'));
        batch.set(detailRef, { ...detail, runId: runRef.id });
    });

    // 3. Create an expense transaction for each employee's gross pay
    data.details.forEach(detail => {
        const expenseRef = doc(collection(db, 'expenseTransactions'));
        batch.set(expenseRef, {
            userId: data.userId,
            date: data.payDate.toISOString().split('T')[0],
            company: detail.employeeName,
            description: `Payroll for period ${data.payPeriodStart.toISOString().split('T')[0]} to ${data.payPeriodEnd.toISOString().split('T')[0]}`,
            totalAmount: detail.grossPay,
            category: '9060', // CRA line for Salaries, wages, and benefits
            type: 'business',
        });
    });

    // 4. Create a single remittance liability for the total deductions
    if (data.totalDeductions > 0) {
        const remittanceRef = doc(collection(db, REMITTANCES_COLLECTION));
        batch.set(remittanceRef, {
            userId: data.userId,
            payPeriodStart: data.payPeriodStart.toISOString().split('T')[0],
            payPeriodEnd: data.payPeriodEnd.toISOString().split('T')[0],
            dueDate: new Date(data.payDate.getFullYear(), data.payDate.getMonth() + 1, 15).toISOString().split('T')[0], // Due 15th of next month
            amount: data.totalDeductions,
            status: 'Due',
        });
    }

    // Commit all operations as a single transaction
    await batch.commit();
}
