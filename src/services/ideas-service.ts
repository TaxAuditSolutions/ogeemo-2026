
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
    writeBatch
} from 'firebase/firestore';
import { initializeFirebase } from '@/lib/firebase';
import { Idea } from '@/types/calendar-types';


const IDEAS_COLLECTION = 'ideas';

async function getDb() {
    const { db } = await initializeFirebase();
    return db;
}

const docToIdea = (doc: any): Idea => {
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
    } as Idea;
};

export async function getIdeas(userId: string): Promise<Idea[]> {
    const db = await getDb();
    const q = query(collection(db, IDEAS_COLLECTION), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToIdea).sort((a, b) => a.position - b.position);
}

export async function addIdea(ideaData: Omit<Idea, 'id'>): Promise<Idea> {
    const db = await getDb();
    const docRef = await addDoc(collection(db, IDEAS_COLLECTION), ideaData);
    return { id: docRef.id, ...ideaData };
}

export async function updateIdea(ideaId: string, ideaData: Partial<Omit<Idea, 'id' | 'userId'>>): Promise<void> {
    const db = await getDb();
    const ideaRef = doc(db, IDEAS_COLLECTION, ideaId);
    await updateDoc(ideaRef, ideaData);
}

export async function deleteIdea(ideaId: string): Promise<void> {
    const db = await getDb();
    const ideaRef = doc(db, IDEAS_COLLECTION, ideaId);
    await deleteDoc(ideaRef);
}

export async function updateIdeaPositions(updates: { id: string; position: number; status: 'Yes' | 'No' | 'Maybe' }[]): Promise<void> {
    const db = await getDb();
    const batch = writeBatch(db);
    updates.forEach(update => {
        const docRef = doc(db, IDEAS_COLLECTION, update.id);
        batch.update(docRef, { position: update.position, status: update.status });
    });
    await batch.commit();
}
