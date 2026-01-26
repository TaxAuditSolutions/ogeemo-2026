
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
    Timestamp,
    orderBy,
} from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';
import type { FolderData } from '@/data/files';

const FOLDERS_COLLECTION = 'contactFolders';

function getDb() {
    const { db } = getFirebaseServices();
    return db;
}

const docToFolder = (doc: any): FolderData => ({ 
    id: doc.id, 
    ...doc.data(),
    createdAt: (doc.data().createdAt as Timestamp)?.toDate() || new Date(),
} as FolderData);


export async function getFolders(userId: string): Promise<FolderData[]> {
  const db = getDb();
  // The orderBy('userId') is a trick to help Firestore use its default indexes more effectively when combined with a 'where' clause on the same field.
  const q = query(collection(db, FOLDERS_COLLECTION), where("userId", "==", userId), orderBy("userId"));
  const snapshot = await getDocs(q);
  // Client-side sort to ensure alphabetical order for display
  return snapshot.docs.map(docToFolder).sort((a,b) => a.name.localeCompare(b.name));
}

export async function addFolder(folderData: Omit<FolderData, 'id' | 'createdAt'>): Promise<FolderData> {
  const db = getDb();
  const dataToSave = {
    ...folderData,
    parentId: folderData.parentId || null,
    createdAt: new Date(),
  };
  const docRef = await addDoc(collection(db, FOLDERS_COLLECTION), dataToSave);
  return { id: docRef.id, ...dataToSave };
}

export async function updateFolder(folderId: string, folderData: Partial<Omit<FolderData, 'id' | 'userId'>>): Promise<void> {
    const db = getDb();
    const folderRef = doc(db, FOLDERS_COLLECTION, folderId);
    await updateDoc(folderRef, folderData);
}

export async function deleteFolders(folderIds: string[]): Promise<void> {
    const db = getDb();
    if (folderIds.length === 0) return;
    const batch = writeBatch(db);

    folderIds.forEach(id => {
        const folderRef = doc(db, FOLDERS_COLLECTION, id);
        batch.delete(folderRef);
    });

    await batch.commit();
}
