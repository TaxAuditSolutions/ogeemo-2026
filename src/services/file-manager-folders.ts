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
    setDoc,
    getDoc
} from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';

export interface FolderItem {
  id: string;
  name: string;
  type: 'folder';
  parentId: string | null;
  userId: string;
  createdAt: Date;
  isSystem?: boolean;
  driveLink?: string;
}

const FOLDERS_COLLECTION = 'fileManagerFolders';
const FILES_COLLECTION = 'files';

function getDb() {
    const { db } = getFirebaseServices();
    return db;
}

const docToFolder = (doc: any): FolderItem => ({ 
    id: doc.id, 
    type: 'folder',
    ...doc.data(),
    createdAt: (doc.data().createdAt as Timestamp)?.toDate() || new Date(),
} as FolderItem);


export async function getFolders(userId: string): Promise<FolderItem[]> {
  const db = getDb();
  const q = query(collection(db, FOLDERS_COLLECTION), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToFolder);
}

export async function addFolder(folderData: Omit<FolderItem, 'id' | 'createdAt' | 'type'>): Promise<FolderItem> {
  const db = getDb();
  const dataToSave = {
    ...folderData,
    parentId: folderData.parentId || null,
    createdAt: new Date(),
  };
  const docRef = await addDoc(collection(db, FOLDERS_COLLECTION), dataToSave);
  return { id: docRef.id, type: 'folder', ...dataToSave };
}

export async function updateFolder(folderId: string, folderData: Partial<Omit<FolderItem, 'id' | 'userId' | 'type'>>): Promise<void> {
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
 * Ensures that mandated system folders exist for the user's document manager.
 * This function is self-healing: it merges duplicates and reassigns files to a single master record.
 */
export async function ensureDocumentSystemFolders(userId: string): Promise<FolderItem[]> {
    const db = getDb();
    const q = query(collection(db, FOLDERS_COLLECTION), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    const existing = snapshot.docs.map(docToFolder);
    
    const systemFoldersList = [
        "Clients",
        "Family",
        "Friends",
        "Miscellaneous",
        "Ogeemo Users",
        "Prospects",
        "Suppliers",
        "Contract Workers",
        "Employee Workers",
        "Images",
        "Marketing",
        "Ogeemo Notes",
        "Knowledge Base"
    ];

    const batch = writeBatch(db);
    let hasChanges = false;
    const currentFolders = [...existing];

    for (const folderName of systemFoldersList) {
        // Find ALL folders matching this name (case-insensitive)
        const matches = currentFolders.filter(f => f.name.toLowerCase() === folderName.toLowerCase());
        
        let masterFolder: FolderItem;

        if (matches.length > 0) {
            // Pick the first one as the master record
            masterFolder = matches[0];
            
            // Ensure it is marked as a system folder
            if (!masterFolder.isSystem) {
                batch.update(doc(db, FOLDERS_COLLECTION, masterFolder.id), { isSystem: true });
                masterFolder.isSystem = true;
                hasChanges = true;
            }

            // Resolve Duplicates: if more than one exists, merge them
            if (matches.length > 1) {
                const duplicates = matches.slice(1);
                for (const dupe of duplicates) {
                    // Reassign all files in the duplicate folder to the master folder
                    const filesQuery = query(
                        collection(db, FILES_COLLECTION), 
                        where("userId", "==", userId), 
                        where("folderId", "==", dupe.id)
                    );
                    const filesSnapshot = await getDocs(filesQuery);
                    filesSnapshot.forEach(fileDoc => {
                        batch.update(fileDoc.ref, { folderId: masterFolder.id });
                    });

                    // Delete the duplicate folder record
                    batch.delete(doc(db, FOLDERS_COLLECTION, dupe.id));
                    
                    // Remove from our local tracking list
                    const index = currentFolders.findIndex(f => f.id === dupe.id);
                    if (index > -1) currentFolders.splice(index, 1);
                    hasChanges = true;
                }
            }
        } else {
            // Create the folder if it doesn't exist at all
            const docRef = doc(collection(db, FOLDERS_COLLECTION));
            const newFolder = {
                name: folderName,
                userId,
                parentId: null,
                isSystem: true,
                createdAt: new Date(),
            };
            batch.set(docRef, newFolder);
            currentFolders.push({ id: docRef.id, type: 'folder', ...newFolder });
            hasChanges = true;
        }
    }

    if (hasChanges) {
        await batch.commit();
    }

    return currentFolders;
}

export async function findOrCreateFileFolder(userId: string, folderName: string): Promise<FolderItem> {
    const db = getDb();
    const q = query(collection(db, FOLDERS_COLLECTION), where("userId", "==", userId), where("name", "==", folderName));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
        return docToFolder(snapshot.docs[0]);
    }
    const newFolderData = { name: folderName, userId, parentId: null, createdAt: new Date() };
    const docRef = await addDoc(collection(db, FOLDERS_COLLECTION), newFolderData);
    return { id: docRef.id, type: 'folder', ...newFolderData };
}
