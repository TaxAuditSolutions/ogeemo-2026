
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
import { getFolders as getContactFolders } from './contact-folder-service';

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
 * This function is self-healing: it merges duplicates, reassigns files, and unifies the taxonomy.
 */
export async function ensureDocumentSystemFolders(userId: string): Promise<FolderItem[]> {
    const db = getDb();
    const q = query(collection(db, FOLDERS_COLLECTION), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    const existing = snapshot.docs.map(docToFolder);
    
    // Unified High-Fidelity Taxonomy
    const systemFoldersConfig = [
        { name: "Workers", parent: null },
        { name: "Employees", parent: "Workers" },
        { name: "Contractors", parent: "Workers" },
        { name: "Clients", parent: null },
        { name: "Prospects", parent: null },
        { name: "Suppliers", parent: null },
        { name: "Family", parent: null },
        { name: "Friends", parent: null },
        { name: "Miscellaneous", parent: null },
        { name: "Ogeemo Users", parent: null },
        { name: "Images", parent: null },
        { name: "Marketing", parent: null },
        { name: "Ogeemo Notes", parent: null },
        { name: "Knowledge Base", parent: null }
    ];

    const batch = writeBatch(db);
    let hasChanges = false;
    const currentFolders = [...existing];

    // Migration helper: mapping old names to new names
    const legacyMap: Record<string, string> = {
        "employee workers": "Employees",
        "contract workers": "Contractors"
    };

    for (const config of systemFoldersConfig) {
        // Find folders by current name or legacy name
        const matches = currentFolders.filter(f => 
            f.name.toLowerCase() === config.name.toLowerCase() ||
            Object.keys(legacyMap).some(old => f.name.toLowerCase() === old && legacyMap[old] === config.name)
        );
        
        let masterFolder: FolderItem;

        if (matches.length > 0) {
            masterFolder = matches[0];
            
            // Rename if it was a legacy name
            if (masterFolder.name.toLowerCase() !== config.name.toLowerCase()) {
                batch.update(doc(db, FOLDERS_COLLECTION, masterFolder.id), { name: config.name });
                masterFolder.name = config.name;
                hasChanges = true;
            }

            if (!masterFolder.isSystem) {
                batch.update(doc(db, FOLDERS_COLLECTION, masterFolder.id), { isSystem: true });
                masterFolder.isSystem = true;
                hasChanges = true;
            }

            // Resolve Duplicates
            if (matches.length > 1) {
                const duplicates = matches.slice(1);
                for (const dupe of duplicates) {
                    const filesQuery = query(collection(db, FILES_COLLECTION), where("userId", "==", userId), where("folderId", "==", dupe.id));
                    const filesSnapshot = await getDocs(filesQuery);
                    filesSnapshot.forEach(fileDoc => {
                        batch.update(fileDoc.ref, { folderId: masterFolder.id });
                    });
                    batch.delete(doc(db, FOLDERS_COLLECTION, dupe.id));
                    const idx = currentFolders.findIndex(f => f.id === dupe.id);
                    if (idx > -1) currentFolders.splice(idx, 1);
                    hasChanges = true;
                }
            }
        } else {
            // Create new
            const docRef = doc(collection(db, FOLDERS_COLLECTION));
            const newFolder: any = {
                name: config.name,
                userId,
                parentId: null,
                isSystem: true,
                createdAt: new Date(),
            };
            batch.set(docRef, newFolder);
            masterFolder = { id: docRef.id, type: 'folder', ...newFolder };
            currentFolders.push(masterFolder);
            hasChanges = true;
        }

        // Apply Hierarchy
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

/**
 * Provisions a specific folder for a worker within the Document Manager.
 * Path: Workers -> [Employees/Contractors] -> [Worker Name]
 * Returns the ID of the provisioned folder.
 */
export async function provisionWorkerDocumentNode(userId: string, contactName: string, contactFolderId: string): Promise<string | null> {
    const db = getDb();
    
    // 1. Get the name of the Contact Hub folder to determine the role
    const contactFolders = await getContactFolders(userId);
    const targetContactFolder = contactFolders.find(f => f.id === contactFolderId);
    if (!targetContactFolder) return null;

    const roleName = targetContactFolder.name;
    // We only automate for the primary worker roles
    if (roleName !== 'Employees' && roleName !== 'Contractors') return null;

    // 2. Ensure Document Manager system folders are present
    const docFolders = await ensureDocumentSystemFolders(userId);
    const workersRoot = docFolders.find(f => f.name === 'Workers' && f.isSystem);
    if (!workersRoot) return null;

    const typeFolder = docFolders.find(f => f.name === roleName && f.parentId === workersRoot.id);
    if (!typeFolder) return null;

    // 3. Create or find the individual worker folder
    const q = query(
        collection(db, FOLDERS_COLLECTION),
        where("userId", "==", userId),
        where("parentId", "==", typeFolder.id),
        where("name", "==", contactName)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
        const newFolder = await addFolder({
            name: contactName,
            userId,
            parentId: typeFolder.id,
        });
        return newFolder.id;
    }
    return snapshot.docs[0].id;
}
