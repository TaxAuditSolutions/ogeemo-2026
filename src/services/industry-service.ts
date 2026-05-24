
'use client';

import {
    collection,
    getDocs,
    addDoc,
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    Timestamp,
} from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';

export interface Industry {
    id: string;
    orgId?: string;
    createdBy?: string;
    updatedBy?: string;
    createdAt?: Date;
    updatedAt?: Date;
    code: string;
    description: string;
    userId: string;
}

const INDUSTRIES_COLLECTION = 'industries';

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

function toClientDate(value: any): Date | undefined {
    if (!value) return undefined;
    if (value instanceof Timestamp) return value.toDate();
    if (value instanceof Date) return value;
    if (typeof value?.toDate === 'function') return value.toDate();
    return undefined;
}

async function getCurrentOrgId(): Promise<string> {
    const currentUser = getCurrentAuthContext();
    const tokenResult = await currentUser.getIdTokenResult();
    const claimedOrgId = tokenResult.claims.orgId;
    if (typeof claimedOrgId === 'string' && claimedOrgId.trim()) {
        return claimedOrgId;
    }

    const db = getDb();
    const userProfileRef = doc(db, 'users', currentUser.uid);
    const userProfileSnap = await getDoc(userProfileRef);
    const profileOrgId = userProfileSnap.data()?.orgId;
    if (typeof profileOrgId === 'string' && profileOrgId.trim()) {
        return profileOrgId;
    }

    throw new Error('Authenticated user is missing an orgId claim and profile orgId.');
}

const docToIndustry = (doc: any): Industry => {
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        createdAt: toClientDate(data.createdAt),
        updatedAt: toClientDate(data.updatedAt),
    } as Industry;
};

export async function getIndustries(_userId: string): Promise<Industry[]> {
    const db = getDb();
    const orgId = await getCurrentOrgId();
    const q = query(collection(db, INDUSTRIES_COLLECTION), where('orgId', '==', orgId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToIndustry);
}

export async function addIndustry(industryData: Omit<Industry, 'id'>): Promise<Industry> {
    const db = getDb();
    const currentUser = getCurrentAuthContext();
    const orgId = await getCurrentOrgId();

    let finalCode = industryData.code?.trim();

    // If no custom code is provided, generate one.
    if (!finalCode) {
        const allCustomIndustries = await getIndustries(currentUser.uid);
        const customCodes = allCustomIndustries
            .map(i => parseInt(i.code.replace('C-', '')))
            .filter(n => !isNaN(n));
        const newCodeNumber = customCodes.length > 0 ? Math.max(...customCodes) + 1 : 101;
        finalCode = `C-${newCodeNumber}`;
    }

    const dataToSave = {
        ...industryData,
        orgId,
        createdBy: currentUser.uid,
        updatedBy: currentUser.uid,
        createdAt: industryData.createdAt || new Date(),
        updatedAt: new Date(),
        code: finalCode,
    };

    const docRef = await addDoc(collection(db, INDUSTRIES_COLLECTION), dataToSave);
    return docToIndustry({ id: docRef.id, data: () => dataToSave });
}

export async function updateIndustry(industryId: string, data: Partial<Omit<Industry, 'id' | 'userId'>>): Promise<void> {
    const db = getDb();
    const currentUser = getCurrentAuthContext();
    const orgId = await getCurrentOrgId();
    const docRef = doc(db, INDUSTRIES_COLLECTION, industryId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists() || docSnap.data().orgId !== orgId) return;

    await updateDoc(docRef, {
        ...data,
        orgId,
        updatedBy: currentUser.uid,
        updatedAt: new Date(),
    });
}

export async function deleteIndustry(industryId: string): Promise<void> {
    const db = getDb();
    const orgId = await getCurrentOrgId();
    const docRef = doc(db, INDUSTRIES_COLLECTION, industryId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists() || docSnap.data().orgId !== orgId) return;
    await deleteDoc(docRef);
}
