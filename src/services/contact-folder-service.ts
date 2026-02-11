
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
    setDoc,
} from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';

export interface FolderData {
  id: string;
  name: string;
  parentId?: string | null;
  userId: string;
  createdAt: Date;
  isSystem?: boolean;
}

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
  const q = query(collection(db, FOLDERS_COLLECTION), where("userId", "==", userId));
  const snapshot = await getDocs(q);
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

/**
 * Ensures that hardcoded system folders exist for the user.
 */
export async function ensureSystemFolders(userId: string): Promise<FolderData[]> {
    const db = getDb();
    const existing = await getFolders(userId);
    
    const systemFoldersConfig = [
        { name: 'Ogeemo Users', parent: null },
        { name: 'Workers', parent: null },
        { name: 'Employees', parent: 'Workers' },
        { name: 'Contractors', parent: 'Workers' },
        { name: 'Clients', parent: null },
        { name: 'Family', parent: null },
        { name: 'Friends', parent: null },
        { name: 'Suppliers', parent: null },
        { name: 'Prospects', parent: null },
        { name: 'Miscellaneous', parent: null },
    ];

    const currentFolders = [...existing];
    const batch = writeBatch(db);
    let hasChanges = false;

    for (const config of systemFoldersConfig) {
        const exists = currentFolders.find(f => f.name === config.name && f.isSystem);
        if (!exists) {
            let parentId = null;
            if (config.parent) {
                const parent = currentFolders.find(f => f.name === config.parent && f.isSystem);
                if (parent) {
                    parentId = parent.id;
                }
            }

            const docRef = doc(collection(db, FOLDERS_COLLECTION));
            const newFolder = {
                name: config.name,
                userId,
                parentId,
                isSystem: true,
                createdAt: new Date(),
            };
            batch.set(docRef, newFolder);
            currentFolders.push({ id: docRef.id, ...newFolder });
            hasChanges = true;
        }
    }

    if (hasChanges) {
        await batch.commit();
    }

    return currentFolders;
}
