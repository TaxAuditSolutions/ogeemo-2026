
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
    Timestamp,
    writeBatch
} from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';
import { Idea } from '@/types/calendar-types';


const IDEAS_COLLECTION = 'ideas';

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

const docToIdea = (doc: any): Idea => {
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        createdAt: toClientDate(data.createdAt),
        updatedAt: toClientDate(data.updatedAt),
    } as Idea;
};

export async function getIdeas(_userId: string): Promise<Idea[]> {
    const db = getDb();
    const orgId = await getCurrentOrgId();
    const q = query(collection(db, IDEAS_COLLECTION), where('orgId', '==', orgId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToIdea).sort((a, b) => a.position - b.position);
}

export async function addIdea(ideaData: Omit<Idea, 'id'>): Promise<Idea> {
    const db = getDb();
    const currentUser = getCurrentAuthContext();
    const orgId = await getCurrentOrgId();
    const dataToSave = {
        ...ideaData,
        orgId,
        createdBy: currentUser.uid,
        updatedBy: currentUser.uid,
        createdAt: ideaData.createdAt || new Date(),
        updatedAt: new Date(),
    };
    const docRef = await addDoc(collection(db, IDEAS_COLLECTION), dataToSave);
    return docToIdea({ id: docRef.id, data: () => dataToSave });
}

export async function updateIdea(ideaId: string, ideaData: Partial<Omit<Idea, 'id' | 'userId'>>): Promise<void> {
    const db = getDb();
    const currentUser = getCurrentAuthContext();
    const orgId = await getCurrentOrgId();
    const ideaRef = doc(db, IDEAS_COLLECTION, ideaId);
    const ideaSnap = await getDoc(ideaRef);
    if (!ideaSnap.exists() || ideaSnap.data().orgId !== orgId) return;

    await updateDoc(ideaRef, {
        ...ideaData,
        orgId,
        updatedBy: currentUser.uid,
        updatedAt: new Date(),
    });
}

export async function deleteIdea(ideaId: string): Promise<void> {
    const db = getDb();
    const orgId = await getCurrentOrgId();
    const ideaRef = doc(db, IDEAS_COLLECTION, ideaId);
    const ideaSnap = await getDoc(ideaRef);
    if (!ideaSnap.exists() || ideaSnap.data().orgId !== orgId) return;
    await deleteDoc(ideaRef);
}

export async function updateIdeaPositions(updates: { id: string; position: number; status: 'Yes' | 'No' | 'Maybe' }[]): Promise<void> {
    const db = getDb();
    const currentUser = getCurrentAuthContext();
    const orgId = await getCurrentOrgId();
    const batch = writeBatch(db);
    for (const update of updates) {
        const docRef = doc(db, IDEAS_COLLECTION, update.id);
        const ideaSnap = await getDoc(docRef);
        if (ideaSnap.exists() && ideaSnap.data().orgId === orgId) {
            batch.update(docRef, {
                position: update.position,
                status: update.status,
                orgId,
                updatedBy: currentUser.uid,
                updatedAt: new Date(),
            });
        }
    }
    await batch.commit();
}
