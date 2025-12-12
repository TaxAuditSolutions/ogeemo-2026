
'use client';

import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { initializeFirebase } from '@/lib/firebase';

export interface Industry {
  id: string;
  code: string;
  description: string;
  userId: string;
}

const INDUSTRIES_COLLECTION = 'industries';

async function getDb() {
    const { db } = await initializeFirebase();
    return db;
}

const docToIndustry = (doc: any): Industry => {
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
    } as Industry;
};

export async function getIndustries(userId: string): Promise<Industry[]> {
    const db = await getDb();
    const q = query(collection(db, INDUSTRIES_COLLECTION), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToIndustry);
}

export async function addIndustry(industryData: Omit<Industry, 'id'>): Promise<Industry> {
    const db = await getDb();
    
    let finalCode = industryData.code?.trim();

    // If no custom code is provided, generate one.
    if (!finalCode) {
        const allCustomIndustries = await getIndustries(industryData.userId);
        const customCodes = allCustomIndustries
            .map(i => parseInt(i.code.replace('C-', '')))
            .filter(n => !isNaN(n));
        const newCodeNumber = customCodes.length > 0 ? Math.max(...customCodes) + 1 : 101;
        finalCode = `C-${newCodeNumber}`;
    }

    const dataToSave = {
        ...industryData,
        code: finalCode,
    };

    const docRef = await addDoc(collection(db, INDUSTRIES_COLLECTION), dataToSave);
    return { id: docRef.id, ...dataToSave };
}

export async function updateIndustry(industryId: string, data: Partial<Omit<Industry, 'id' | 'userId'>>): Promise<void> {
    const db = await getDb();
    const docRef = doc(db, INDUSTRIES_COLLECTION, industryId);
    await updateDoc(docRef, data);
}

export async function deleteIndustry(industryId: string): Promise<void> {
    const db = await getDb();
    const docRef = doc(db, INDUSTRIES_COLLECTION, industryId);
    await deleteDoc(docRef);
}
    
