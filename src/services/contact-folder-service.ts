
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
import { initializeFirebase } from '@/firebase';
import type { FolderItem } from '@/data/files';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const FOLDERS_COLLECTION = 'contactFolders';

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

export function addFolder(folderData: Omit<FolderItem, 'id' | 'createdAt'>): Promise<FolderItem> {
    return new Promise(async (resolve, reject) => {
        const db = await getDb();
        const collectionRef = collection(db, FOLDERS_COLLECTION);
        const dataToSave = {
            ...folderData,
            parentId: folderData.parentId || null,
            createdAt: new Date(),
        };

        addDoc(collectionRef, dataToSave)
            .then(docRef => {
                const newFolder = { id: docRef.id, ...dataToSave };
                resolve(newFolder);
            })
            .catch(serverError => {
                const permissionError = new FirestorePermissionError({
                    path: collectionRef.path,
                    operation: 'create',
                    requestResourceData: dataToSave,
                });
                errorEmitter.emit('permission-error', permissionError);
                reject(serverError);
            });
    });
}

export function updateFolder(folderId: string, folderData: Partial<Omit<FolderItem, 'id' | 'userId'>>): Promise<void> {
    return new Promise(async (resolve, reject) => {
        const db = await getDb();
        const folderRef = doc(db, FOLDERS_COLLECTION, folderId);

        updateDoc(folderRef, folderData)
            .then(() => resolve())
            .catch(serverError => {
                const permissionError = new FirestorePermissionError({
                    path: folderRef.path,
                    operation: 'update',
                    requestResourceData: folderData,
                });
                errorEmitter.emit('permission-error', permissionError);
                reject(serverError);
            });
    });
}

export function deleteFolders(folderIds: string[]): Promise<void> {
    return new Promise(async (resolve, reject) => {
        const db = await getDb();
        if (folderIds.length === 0) {
            resolve();
            return;
        }
        const batch = writeBatch(db);

        folderIds.forEach(id => {
            const folderRef = doc(db, FOLDERS_COLLECTION, id);
            batch.delete(folderRef);
        });

        batch.commit()
            .then(() => resolve())
            .catch(serverError => {
                const permissionError = new FirestorePermissionError({
                    path: `batch delete on ${FOLDERS_COLLECTION}`,
                    operation: 'delete',
                    requestResourceData: { ids: folderIds },
                });
                errorEmitter.emit('permission-error', permissionError);
                reject(serverError);
            });
    });
}
