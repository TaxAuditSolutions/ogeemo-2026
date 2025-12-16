
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
}

const LEAVE_REQUESTS_COLLECTION = 'leaveRequests';

async function getDb() {
    const { db } = await initializeFirebase();
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
    const db = await getDb();
    // For admins, we fetch all requests under their user ID.
    // For workers, security rules will limit this to only their own requests.
    const q = query(collection(db, LEAVE_REQUESTS_COLLECTION), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToLeaveRequest).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
}

export async function addLeaveRequest(data: Omit<LeaveRequest, 'id'>): Promise<LeaveRequest> {
    const db = await getDb();
    const docRef = await addDoc(collection(db, LEAVE_REQUESTS_COLLECTION), data);
    return { id: docRef.id, ...data };
}

export async function updateLeaveRequest(id: string, data: Partial<Omit<LeaveRequest, 'id' | 'userId' | 'workerId'>>): Promise<void> {
    const db = await getDb();
    const docRef = doc(db, LEAVE_REQUESTS_COLLECTION, id);
    await updateDoc(docRef, data);
}
