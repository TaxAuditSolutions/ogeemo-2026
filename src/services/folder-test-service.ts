
'use client';

import {
  getFirestore,
  collection,
  getDocs,
  doc,
  addDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { initializeFirebase } from '@/lib/firebase';

export interface TestFolder {
  id: string;
  name: string;
  userId: string;
  createdAt: Date;
  parentId: string | null;
}

const TEST_FOLDERS_COLLECTION = 'testFolders';

async function getDb() {
    const { db } = await initializeFirebase();
    return db;
}

const docToTestFolder = (doc: any): TestFolder => {
    const data = doc.data();
    return {
        id: doc.id,
        name: data.name,
        userId: data.userId,
        createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
        parentId: data.parentId || null,
    } as TestFolder;
};

export async function getTestFolders(userId: string): Promise<TestFolder[]> {
    const db = await getDb();
    const q = query(collection(db, TEST_FOLDERS_COLLECTION), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToTestFolder).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function addTestFolder(folderData: Omit<TestFolder, 'id' | 'createdAt'>): Promise<TestFolder> {
    const db = await getDb();
    const dataToSave = {
        ...folderData,
        createdAt: new Date(),
    };
    const docRef = await addDoc(collection(db, TEST_FOLDERS_COLLECTION), dataToSave);
    return { id: docRef.id, ...dataToSave };
}
