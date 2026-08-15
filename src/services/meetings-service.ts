import {
    collection,
    getDocs,
    getDoc,
    doc,
    addDoc,
    deleteDoc,
    updateDoc,
    query,
    where,
    Timestamp,
} from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';
import { type Meeting } from '@/types/meetings';

const MEETINGS_COLLECTION = 'meetings';

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
    const tokenResult = await currentUser.getIdTokenResult();
    const orgId = tokenResult.claims.orgId;
    if (typeof orgId !== 'string' || !orgId.trim()) {
        throw new Error('Authenticated user is missing an orgId claim.');
    }
    return orgId;
}

function toClientDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Timestamp) return value.toDate();
    if (value instanceof Date) return value;
    if (typeof value?.toDate === 'function') return value.toDate();
    return null;
}

function toFirestoreDateValue(value: any): Date | null {
    if (value === null) return null;
    if (!value) return null;
    if (value instanceof Timestamp) return value.toDate();
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
}

const docToMeeting = (doc: any): Meeting => {
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        date: toClientDate(data.date),
        createdAt: toClientDate(data.createdAt),
        updatedAt: toClientDate(data.updatedAt),
    } as Meeting;
};

export async function getMeetings(): Promise<Meeting[]> {
    const db = getDb();
    const orgId = await getCurrentOrgId();
    
    const q = query(
        collection(db, MEETINGS_COLLECTION),
        where("orgId", "==", orgId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToMeeting);
}

export async function addMeeting(meetingData: Omit<Meeting, 'id'>): Promise<Meeting> {
    const db = getDb();
    const currentUser = getCurrentAuthContext();
    const orgId = await getCurrentOrgId();
    
    const dataToSave = {
        ...meetingData,
        orgId,
        createdBy: currentUser.uid,
        updatedBy: currentUser.uid,
        createdAt: meetingData.createdAt || new Date(),
        updatedAt: new Date(),
        date: toFirestoreDateValue(meetingData.date),
    };
    
    const docRef = await addDoc(collection(db, MEETINGS_COLLECTION), dataToSave);
    return docToMeeting({ id: docRef.id, data: () => dataToSave });
}

export async function updateMeeting(meetingId: string, dataToUpdate: Partial<Omit<Meeting, 'id' | 'orgId' | 'createdAt'>>): Promise<void> {
    const db = getDb();
    const currentUser = getCurrentAuthContext();
    const orgId = await getCurrentOrgId();
    
    const meetingRef = doc(db, MEETINGS_COLLECTION, meetingId);
    const meetingSnap = await getDoc(meetingRef);
    if (!meetingSnap.exists() || meetingSnap.data().orgId !== orgId) return;

    const updatedData: any = {
        ...dataToUpdate,
        updatedBy: currentUser.uid,
        updatedAt: new Date(),
    };
    
    if ('date' in updatedData) {
        updatedData.date = toFirestoreDateValue(updatedData.date);
    }

    await updateDoc(meetingRef, updatedData);
}

export async function deleteMeeting(meetingId: string): Promise<void> {
    const db = getDb();
    const orgId = await getCurrentOrgId();
    
    const meetingRef = doc(db, MEETINGS_COLLECTION, meetingId);
    const snap = await getDoc(meetingRef);
    if (!snap.exists() || snap.data().orgId !== orgId) return;
    
    await deleteDoc(meetingRef);
}