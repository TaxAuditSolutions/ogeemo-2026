
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
import { getFirebaseServices } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


export interface LeaveRequest {
  id: string;
  workerId: string;
  workerName: string;
  leaveType: 'Vacation' | 'Sick' | 'Personal' | 'Unpaid';
  startDate: string; // ISO string date
  endDate: string; // ISO string date
  reason: string;
  status: 'Pending' | 'Approved' | 'Denied';
  adminNotes?: string;
  userId: string;
  approverId?: string;
  approverName?: string;
}

const LEAVE_REQUESTS_COLLECTION = 'leaveRequests';

function getDb() {
    const { db } = getFirebaseServices();
    return db;
}

const docToLeaveRequest = (doc: any): LeaveRequest => {
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
    } as LeaveRequest;
};

export async function getLeaveRequests(userId: string): Promise<LeaveRequest[]> {
    const db = getDb();
    // For admins, we fetch all requests under their user ID.
    // For workers, security rules will limit this to only their own requests.
    const q = query(collection(db, LEAVE_REQUESTS_COLLECTION), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToLeaveRequest).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
}

export function addLeaveRequest(data: Omit<LeaveRequest, 'id'>): Promise<LeaveRequest> {
    return new Promise(async (resolve, reject) => {
        const db = getDb();
        const collectionRef = collection(db, LEAVE_REQUESTS_COLLECTION);
        addDoc(collectionRef, data)
            .then(docRef => resolve({ id: docRef.id, ...data }))
            .catch(serverError => {
                const permissionError = new FirestorePermissionError({
                    path: collectionRef.path,
                    operation: 'create',
                    requestResourceData: data,
                });
                errorEmitter.emit('permission-error', permissionError);
                reject(serverError);
            });
    });
}

export function updateLeaveRequest(id: string, data: Partial<Omit<LeaveRequest, 'id' | 'userId' | 'workerId'>>): Promise<void> {
    return new Promise(async (resolve, reject) => {
        const db = getDb();
        const docRef = doc(db, LEAVE_REQUESTS_COLLECTION, id);
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
