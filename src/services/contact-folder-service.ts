
'use client';

import { 
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
const CONTACTS_COLLECTION = 'contacts';

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
 * Ensures that mandated system folders exist for the user.
 * This function is self-healing: it merges duplicates and reassigns contacts to a single master record.
 */
export async function ensureSystemFolders(userId: string): Promise<FolderData[]> {
    const db = getDb();
    const q = query(collection(db, FOLDERS_COLLECTION), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    const existing = snapshot.docs.map(docToFolder);
    
    // Mandated System Taxonomy
    const systemFoldersConfig = [
        { name: 'Admin', parent: null },
        { name: 'Workers', parent: null },
        { name: 'Employees', parent: 'Workers' },
        { name: 'Contractors', parent: 'Workers' },
        { name: 'Suppliers', parent: null },
        { name: 'Clients', parent: null },
        { name: 'Prospects', parent: null },
        { name: 'Family', parent: null },
        { name: 'Friends', parent: null },
        { name: 'Miscellaneous', parent: null },
    ];

    const batch = writeBatch(db);
    let hasChanges = false;
    const currentFolders = [...existing];

    for (const config of systemFoldersConfig) {
        // Find ALL folders matching this name (case-insensitive)
        const matches = currentFolders.filter(f => f.name.toLowerCase() === config.name.toLowerCase());
        
        let masterFolder: FolderData;

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
                    // Reassign all contacts in the duplicate folder to the master folder
                    const contactsQuery = query(collection(db, CONTACTS_COLLECTION), where("userId", "==", userId), where("folderId", "==", dupe.id));
                    const contactsSnapshot = await getDocs(contactsQuery);
                    contactsSnapshot.forEach(contactDoc => {
                        batch.update(contactDoc.ref, { folderId: masterFolder.id });
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
            let parentId: string | null = null;
            if (config.parent) {
                const parentMatch = currentFolders.find(f => f.name.toLowerCase() === config.parent!.toLowerCase());
                if (parentMatch) parentId = parentMatch.id;
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
            masterFolder = { id: docRef.id, ...newFolder };
            currentFolders.push(masterFolder);
            hasChanges = true;
        }

        // Hierarchy Enforcement: Ensure subfolders point to the master parent
        if (config.parent) {
            const parentMatch = currentFolders.find(f => f.name.toLowerCase() === config.parent!.toLowerCase());
            if (parentMatch && masterFolder.parentId !== parentMatch.id) {
                batch.update(doc(db, FOLDERS_COLLECTION, masterFolder.id), { parentId: parentMatch.id });
                masterFolder.parentId = parentMatch.id;
                hasChanges = true;
            }
        }
    }

    if (hasChanges) {
        await batch.commit();
    }

    return currentFolders;
}
