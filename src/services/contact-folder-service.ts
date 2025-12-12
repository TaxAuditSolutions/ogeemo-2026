
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
    writeBatch,
    Timestamp 
} from 'firebase/firestore';
import { initializeFirebase } from '@/lib/firebase';
import type { FolderItem } from '@/data/files';

const FOLDERS_COLLECTION = 'contactFolders'; // The new, unique collection name

async function getDb() {
    const { db } = await initializeFirebase();
    return db;
}

const docToFolder = (doc: any): FolderItem => ({ 
    id: doc.id, 
    ...doc.data(),
    createdAt: (doc.data().createdAt as Timestamp)?.toDate() || new Date(),
} as FolderItem);


export async function getFolders(userId: string): Promise<FolderItem[]> {
  const db = await getDb();
  const q = query(collection(db, FOLDERS_COLLECTION), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToFolder);
}

export async function addFolder(folderData: Omit<FolderItem, 'id' | 'createdAt'>): Promise<FolderItem> {
  const db = await getDb();
  const dataToSave = {
    ...folderData,
    parentId: folderData.parentId || null,
    createdAt: new Date(),
  };
  const docRef = await addDoc(collection(db, FOLDERS_COLLECTION), dataToSave);
  return { id: docRef.id, ...dataToSave };
}

export async function updateFolder(folderId: string, folderData: Partial<Omit<FolderItem, 'id' | 'userId'>>): Promise<void> {
    const db = await getDb();
    const folderRef = doc(db, FOLDERS_COLLECTION, folderId);
    await updateDoc(folderRef, folderData);
}

export async function deleteFolders(folderIds: string[]): Promise<void> {
    const db = await getDb();
    if (folderIds.length === 0) return;
    const batch = writeBatch(db);

    folderIds.forEach(id => {
        const folderRef = doc(db, FOLDERS_COLLECTION, id);
        batch.delete(folderRef);
    });

    await batch.commit();
}
