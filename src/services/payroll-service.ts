'use client';

import {
    collection,
    getDocs,
    getDoc,
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
import { ensureSystemFolders } from '@/services/contact-folder-service';
import { deleteContacts, mergeContacts, type MergeContactsResult } from '@/services/contact-service';
import { omitUndefined, replaceUndefinedWithNull } from '@/lib/write-payload';
import { todayDateKey } from '@/lib/ledger-date';
import { alreadyPaid, alreadyPaidMessage, newestFirst } from '@/lib/payroll-history';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

/**
 * @fileOverview Refactored Payroll Service for Ogeemo.
 * Consolidates 'Workers' into the Contact Hub as the Single Source of Truth.
 */

export type Worker = Contact;
export type Employee = Worker;

const CONTACTS_COLLECTION = 'contacts';
const FOLDERS_COLLECTION = 'contactFolders';
const REMITTANCES_COLLECTION = 'payrollRemittances';
const PAYROLL_RUNS_COLLECTION = 'payrollRuns';

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
        console.warn('Payroll service: unable to read auth claims; falling back to user profile org lookup.', error);
    }
    const orgId = tokenResult?.claims?.orgId;

    if (typeof orgId !== 'string' || !orgId.trim()) {
        throw new Error('Authenticated user is missing an orgId claim.');
    }

    return orgId;
}

function toDate(value: unknown): Date | undefined {
    if (value instanceof Date) return value;
    if (value && typeof value === 'object' && 'toDate' in value && typeof (value as Timestamp).toDate === 'function') {
        return (value as Timestamp).toDate();
    }
    return undefined;
}

const docToWorker = (doc: any): Worker => {
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        payRate: Number(data.payRate) || 0,
        createdAt: toDate(data.createdAt) ?? data.createdAt,
        updatedAt: toDate(data.updatedAt) ?? data.updatedAt,
        // Normalize date fields at the boundary so consumers never see raw
        // Timestamps (the Edit Worker form converts them to input values).
        hireDate: toDate(data.hireDate) ?? data.hireDate,
        startDate: toDate(data.startDate) ?? data.startDate,
    } as Worker;
};

/**
 * Fetches all workers from the Contact Hub based strictly on folder assignment.
 * This adheres to the protocol: If they are in the Workers/Employees/Contractors folders, they are workers.
 * Scoped strictly to the current user to prevent 'IN' comparison limit errors.
 */
export async function getEmployees(userId: string): Promise<Employee[]> {
    return getWorkers(userId);
}

export async function getWorkers(userId: string): Promise<Worker[]> {
    const db = getDb();
    const orgId = await getCurrentOrgId();

    if (!userId || typeof userId !== 'string') return [];

    try {
        // 1. Resolve the mandated system folder IDs for THIS user only
        const foldersRef = collection(db, FOLDERS_COLLECTION);
        const foldersQuery = query(foldersRef, where("orgId", "==", orgId));

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
            where("orgId", "==", orgId),
            where("folderId", "in", workerFolderIds.slice(0, 30))
        );

        const snapshot = await getDocs(q);
        // Explicitly filter for presence of worker metadata to be defensive
        return snapshot.docs
            .map(docToWorker)
            .filter(w => w.workerType !== null && w.workerType !== undefined)
            .sort((a, b) => a.name.localeCompare(b.name));

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

/** Resolves the system folder a worker must live in (getWorkers requires it). */
async function resolveWorkerFolderId(workerType?: Worker['workerType']): Promise<string> {
    const currentUser = getCurrentAuthContext();
    const folders = await ensureSystemFolders(currentUser.uid);
    const wanted = workerType === 'contractor' ? 'contractors' : 'employees';
    const target =
        folders.find((f) => f.name?.toLowerCase() === wanted) ||
        folders.find((f) => f.name?.toLowerCase() === 'workers');
    if (!target) {
        throw new Error('Worker system folders are unavailable; cannot file this worker.');
    }
    return target.id;
}

export async function addWorker(data: Omit<Worker, 'id'>): Promise<Worker> {
    const db = getDb();
    const orgId = await getCurrentOrgId();
    const currentUser = getCurrentAuthContext();
    const now = new Date();
    // Workers must live in the Workers taxonomy or getWorkers cannot see them
    // (beta gap: workers added through the UI were invisible). File by type.
    const folderId = data.folderId || (await resolveWorkerFolderId(data.workerType));
    // Firestore rejects `undefined` field values outright (the SDK throws
    // "Unsupported field value: undefined", failing the save) - the worker
    // form maps every blank optional field to undefined. Strip them:
    // absent = "not provided".
    const dataToSave = omitUndefined({
        ...data,
        folderId,
        orgId,
        createdBy: currentUser.uid,
        updatedBy: currentUser.uid,
        createdAt: now,
        updatedAt: now,
    });
    const docRef = await addDoc(collection(db, CONTACTS_COLLECTION), dataToSave);
    return { id: docRef.id, ...dataToSave } as Worker;
}

export async function updateWorker(id: string, data: Partial<Omit<Worker, 'id' | 'userId'>>): Promise<void> {
    const db = getDb();
    const orgId = await getCurrentOrgId();
    const currentUser = getCurrentAuthContext();
    const workerRef = doc(db, CONTACTS_COLLECTION, id);
    const snapshot = await getDoc(workerRef);

    if (!snapshot.exists() || snapshot.data()?.orgId !== orgId) {
        throw new Error('Worker not found for the current organization.');
    }

    const before = snapshot.data() as any;
    const patch: Record<string, unknown> = { ...data };
    const finalWorkerType = data.workerType !== undefined ? data.workerType : before?.workerType;
    if (finalWorkerType) {
        // Self-heal: a worker record outside the Workers taxonomy is invisible
        // to getWorkers. Re-file it (also converts plain contacts on demand).
        const folders = await ensureSystemFolders(currentUser.uid);
        const workerFolderIds = new Set(
            folders
                .filter((f) => ['employees', 'contractors', 'workers'].includes(String(f.name || '').toLowerCase()))
                .map((f) => f.id),
        );
        const currentFolder = data.folderId !== undefined ? data.folderId : before?.folderId;
        if (!currentFolder || !workerFolderIds.has(currentFolder)) {
            patch.folderId = await resolveWorkerFolderId(finalWorkerType);
        }
    }

    // `undefined` is invalid for Firestore writes (see addWorker); a cleared
    // optional field means null ("empty"), never undefined.
    await updateDoc(workerRef, {
        ...replaceUndefinedWithNull(patch),
        updatedBy: currentUser.uid,
        updatedAt: new Date(),
    });
}

export async function deleteWorker(id: string): Promise<void> {
    await deleteContacts([id]);
}

/** Workers are contacts, so deleting them is the guarded contact delete: nothing in use can be removed. */
export async function deleteWorkers(workerIds: string[]): Promise<void> {
    await deleteContacts(workerIds);
}

/**
 * Workers are Contact Hub records, so merging two workers is a contact merge.
 * Delegating keeps one safe implementation: every linked record (tasks,
 * projects, quotes, invoices, work orders, time logs, leave requests...) is
 * re-pointed at the master before the duplicate is deleted. This used to move
 * only time logs and leave requests, orphaning everything else.
 *
 * Historical payroll runs are deliberately left alone: each stores the
 * employee's name alongside the id as an audit snapshot of what was paid.
 */
export function mergeWorkers(sourceWorkerId: string, masterWorkerId: string): Promise<MergeContactsResult> {
    return mergeContacts(sourceWorkerId, masterWorkerId);
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
    orgId?: string;
    createdBy?: string;
    updatedBy?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface PayrollRunDetail {
    employeeId: string;
    employeeName: string;
    grossPay: number;
    deductions: number;
    netPay: number;
}

export interface PayrollRun {
    userId: string;
    payPeriodStart: Date;
    payPeriodEnd: Date;
    payDate: Date;
    totalGrossPay: number;
    totalDeductions: number;
    totalNetPay: number;
    employeeCount: number;
    /** The deduction estimate (percent of gross) used for this run, kept so history stays an audit snapshot. */
    deductionRatePercent?: number;
    details: PayrollRunDetail[];
}

export async function getRemittances(userId: string): Promise<PayrollRemittance[]> {
    const db = getDb();
    if (!userId) return [];
    const orgId = await getCurrentOrgId();
    const q = query(collection(db, REMITTANCES_COLLECTION), where("orgId", "==", orgId));
    try {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: toDate(doc.data().createdAt) ?? doc.data().createdAt,
            updatedAt: toDate(doc.data().updatedAt) ?? doc.data().updatedAt,
        } as any)).sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
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
    };
    const docRef = await addDoc(collection(db, REMITTANCES_COLLECTION), dataToSave);
    return { id: docRef.id, ...dataToSave } as PayrollRemittance;
}

export async function updateRemittance(id: string, data: Partial<Omit<PayrollRemittance, 'id' | 'userId'>>): Promise<void> {
    const db = getDb();
    const orgId = await getCurrentOrgId();
    const currentUser = getCurrentAuthContext();
    const remittanceRef = doc(db, REMITTANCES_COLLECTION, id);
    const snapshot = await getDoc(remittanceRef);

    if (!snapshot.exists() || snapshot.data()?.orgId !== orgId) {
        throw new Error('Remittance not found for the current organization.');
    }

    await updateDoc(remittanceRef, {
        ...data,
        updatedBy: currentUser.uid,
        updatedAt: new Date(),
    });
}

/**
 * Marks a remittance paid AND records the cash leaving to CRA in one batch, so the status and the
 * ledger can never disagree (a failure saves neither). A remittance already paid is refused, so a
 * double click or a second tab cannot record the payment twice.
 *
 * The ledger entry is flagged isPayrollRemittance: the payroll run already expensed each worker's
 * full gross pay (the deductions are part of it), so the Income Statement leaves this entry out
 * instead of counting the same wages a second time.
 */
export async function markRemittancePaid(id: string, paidDay: string): Promise<{ expenseId: string }> {
    const db = getDb();
    const orgId = await getCurrentOrgId();
    const currentUser = getCurrentAuthContext();
    const remittanceRef = doc(db, REMITTANCES_COLLECTION, id);
    const snapshot = await getDoc(remittanceRef);

    if (!snapshot.exists() || snapshot.data()?.orgId !== orgId) {
        throw new Error('Remittance not found for the current organization.');
    }
    const remittance = snapshot.data() as PayrollRemittance;
    if (remittance.status === 'Paid') {
        throw new Error('This remittance has already been marked as paid.');
    }

    const now = new Date();
    const expenseRef = doc(collection(db, 'expenseTransactions'));
    const batch = writeBatch(db);
    batch.update(remittanceRef, {
        status: 'Paid',
        paidDate: paidDay,
        updatedBy: currentUser.uid,
        updatedAt: now,
    });
    batch.set(expenseRef, {
        userId: currentUser.uid,
        orgId,
        date: paidDay,
        company: 'Canada Revenue Agency',
        description: `Payroll remittance for ${remittance.payPeriodStart} - ${remittance.payPeriodEnd}`,
        totalAmount: remittance.amount,
        preTaxAmount: remittance.amount,
        taxAmount: 0,
        taxRate: 0,
        category: '9060',
        type: 'business',
        isPayrollRemittance: true,
        remittanceId: id,
        createdBy: currentUser.uid,
        updatedBy: currentUser.uid,
        createdAt: now,
        updatedAt: now,
    });
    await batch.commit();
    return { expenseId: expenseRef.id };
}

export async function deleteRemittance(id: string): Promise<void> {
    const db = getDb();
    const orgId = await getCurrentOrgId();
    const remittanceRef = doc(db, REMITTANCES_COLLECTION, id);
    const snapshot = await getDoc(remittanceRef);

    if (!snapshot.exists() || snapshot.data()?.orgId !== orgId) {
        throw new Error('Remittance not found for the current organization.');
    }

    await deleteDoc(remittanceRef);
}

/** A saved payroll run as the History screen and the pay stub read it: day keys, never raw timestamps. */
export interface SavedPayrollRun {
    id: string;
    periodStart: string;
    periodEnd: string;
    payDate: string;
    createdAtMs: number;
    totalGrossPay: number;
    totalDeductions: number;
    totalNetPay: number;
    employeeCount: number;
    deductionRatePercent?: number;
    details: PayrollRunDetail[];
}

/** Every payroll run saved by this workspace, newest first, each with its per-worker lines. */
export async function getPayrollRuns(userId: string): Promise<SavedPayrollRun[]> {
    const db = getDb();
    if (!userId) return [];
    const orgId = await getCurrentOrgId();
    try {
        const snapshot = await getDocs(query(collection(db, PAYROLL_RUNS_COLLECTION), where('orgId', '==', orgId)));
        const runs = await Promise.all(snapshot.docs.map(async (runDoc) => {
            const data = runDoc.data();
            const detailSnap = await getDocs(collection(db, PAYROLL_RUNS_COLLECTION, runDoc.id, 'details'));
            const start = toDate(data.payPeriodStart);
            const end = toDate(data.payPeriodEnd);
            const pay = toDate(data.payDate);
            return {
                id: runDoc.id,
                periodStart: start ? todayDateKey(start) : '',
                periodEnd: end ? todayDateKey(end) : '',
                payDate: pay ? todayDateKey(pay) : '',
                createdAtMs: toDate(data.createdAt)?.getTime() ?? 0,
                totalGrossPay: Number(data.totalGrossPay) || 0,
                totalDeductions: Number(data.totalDeductions) || 0,
                totalNetPay: Number(data.totalNetPay) || 0,
                employeeCount: Number(data.employeeCount) || detailSnap.size,
                ...(data.deductionRatePercent !== undefined ? { deductionRatePercent: Number(data.deductionRatePercent) } : {}),
                details: detailSnap.docs.map((d) => {
                    const detail = d.data();
                    return {
                        employeeId: String(detail.employeeId ?? ''),
                        employeeName: String(detail.employeeName ?? ''),
                        grossPay: Number(detail.grossPay) || 0,
                        deductions: Number(detail.deductions) || 0,
                        netPay: Number(detail.netPay) || 0,
                    };
                }),
            } as SavedPayrollRun;
        }));
        return newestFirst(runs.filter((run) => run.payDate));
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: PAYROLL_RUNS_COLLECTION,
                operation: 'list',
            } satisfies SecurityRuleContext));
        }
        throw error;
    }
}


export async function savePayrollRun(data: PayrollRun): Promise<void> {
    // Nobody is paid twice for the same days: refuse a period that overlaps one already paid to a worker in this run.
    const previous = await getPayrollRuns(data.userId);
    const clashes = alreadyPaid(
        previous,
        { start: todayDateKey(data.payPeriodStart), end: todayDateKey(data.payPeriodEnd) },
        data.details.map((detail) => ({ employeeId: detail.employeeId, employeeName: detail.employeeName }))
    );
    if (clashes.length > 0) throw new Error(alreadyPaidMessage(clashes));
    if (data.payPeriodEnd.getTime() < data.payPeriodStart.getTime()) throw new Error('The pay period ends before it starts.');

    const db = getDb();
    const orgId = await getCurrentOrgId();
    const currentUser = getCurrentAuthContext();
    const now = new Date();
    const batch = writeBatch(db);
    const runRef = doc(collection(db, PAYROLL_RUNS_COLLECTION));
    batch.set(runRef, {
        userId: data.userId,
        orgId,
        payPeriodStart: data.payPeriodStart,
        payPeriodEnd: data.payPeriodEnd,
        payDate: data.payDate,
        totalGrossPay: data.totalGrossPay,
        totalDeductions: data.totalDeductions,
        totalNetPay: data.totalNetPay,
        employeeCount: data.employeeCount,
        ...(data.deductionRatePercent !== undefined ? { deductionRatePercent: data.deductionRatePercent } : {}),
        createdBy: currentUser.uid,
        updatedBy: currentUser.uid,
        createdAt: now,
        updatedAt: now,
    });

    data.details.forEach((detail: any) => {
        const detailRef = doc(collection(db, PAYROLL_RUNS_COLLECTION, runRef.id, 'details'));
        batch.set(detailRef, { ...detail, runId: runRef.id, userId: data.userId, orgId, createdBy: currentUser.uid, updatedBy: currentUser.uid, createdAt: now, updatedAt: now });

        const expenseRef = doc(collection(db, 'expenseTransactions'));
        batch.set(expenseRef, {
            userId: data.userId,
            orgId,
            // Local days: toISOString() is the UTC day, which is already "tomorrow" on a Canadian evening.
            date: todayDateKey(data.payDate),
            company: detail.employeeName,
            description: `Payroll for period ${todayDateKey(data.payPeriodStart)} - ${todayDateKey(data.payPeriodEnd)}`,
            totalAmount: detail.grossPay,
            category: '9060',
            type: 'business',
            createdBy: currentUser.uid,
            updatedBy: currentUser.uid,
            createdAt: now,
            updatedAt: now,
        });
    });

    if (data.totalDeductions > 0) {
        const remittanceRef = doc(collection(db, REMITTANCES_COLLECTION));
        batch.set(remittanceRef, {
            userId: data.userId,
            orgId,
            payPeriodStart: todayDateKey(data.payPeriodStart),
            payPeriodEnd: todayDateKey(data.payPeriodEnd),
            dueDate: todayDateKey(new Date(data.payDate.getFullYear(), data.payDate.getMonth() + 1, 15)),
            amount: data.totalDeductions,
            status: 'Due',
            createdBy: currentUser.uid,
            updatedBy: currentUser.uid,
            createdAt: now,
            updatedAt: now,
        });
    }
    await batch.commit();
}
