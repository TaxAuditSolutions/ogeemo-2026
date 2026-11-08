
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
import { SYSTEM_FOLDERS, checkFolderName, planFolderDelete, wouldCreateCycle } from '@/lib/contact-folder-rules';

export interface FolderData {
    id: string;
    name: string;
    parentId?: string | null;
    userId: string;
    orgId?: string;
    createdAt: Date;
    isSystem?: boolean;
}

const FOLDERS_COLLECTION = 'contactFolders';
const CONTACTS_COLLECTION = 'contacts';

function getDb() {
    const { db } = getFirebaseServices();
    return db;
}

function getCurrentAuthContext() {
    const { auth } = getFirebaseServices();
    const currentUser = auth.currentUser;

    if (!currentUser) {
        throw new Error('User must be logged in.');
    }

    return currentUser;
}

async function getCurrentOrgId(): Promise<string> {
    const currentUser = getCurrentAuthContext();
    const tokenResult = await currentUser.getIdTokenResult();
    const orgId = tokenResult.claims.orgId;

    if (typeof orgId !== 'string' || !orgId.trim()) {
        throw new Error('Authenticated user is missing an orgId claim.');
    }

    return orgId;
}

const docToFolder = (doc: any): FolderData => ({
    id: doc.id,
    ...doc.data(),
    createdAt: (doc.data().createdAt as Timestamp)?.toDate() || new Date(),
} as FolderData);


export async function getFolders(_userId?: string): Promise<FolderData[]> {
    const db = getDb();
    const orgId = await getCurrentOrgId();
    const q = query(collection(db, FOLDERS_COLLECTION), where("orgId", "==", orgId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToFolder).sort((a, b) => a.name.localeCompare(b.name));
}

export async function addFolder(folderData: Omit<FolderData, 'id' | 'createdAt'>): Promise<FolderData> {
    const db = getDb();
    const orgId = await getCurrentOrgId();

    // The same rules the screens use, checked here too so no caller can create a look-alike of a system folder.
    const existing = await getFolders();
    const problem = checkFolderName(folderData.name, folderData.parentId, existing);
    if (problem) throw new Error(problem);
    if (folderData.parentId && !existing.some((folder) => folder.id === folderData.parentId)) {
        throw new Error('The parent folder no longer exists.');
    }

    const dataToSave = {
        ...folderData,
        name: folderData.name.trim().replace(/\s+/g, ' '),
        orgId,
        parentId: folderData.parentId || null,
        createdAt: new Date(),
    };
    const docRef = await addDoc(collection(db, FOLDERS_COLLECTION), dataToSave);
    return { id: docRef.id, ...dataToSave };
}

export async function updateFolder(folderId: string, folderData: Partial<Omit<FolderData, 'id' | 'userId'>>): Promise<void> {
    const db = getDb();
    const all = await getFolders();
    const current = all.find((folder) => folder.id === folderId);
    if (!current) throw new Error('That folder no longer exists.');

    const changes: Record<string, unknown> = { ...folderData };
    if (current.isSystem && (folderData.name !== undefined || folderData.parentId !== undefined)) {
        throw new Error(`"${current.name}" is a system folder and cannot be renamed or moved.`);
    }
    if (folderData.name !== undefined) {
        const problem = checkFolderName(folderData.name, current.parentId, all, folderId);
        if (problem) throw new Error(problem);
        changes.name = folderData.name.trim().replace(/\s+/g, ' ');
    }
    if (folderData.parentId !== undefined) {
        if (folderData.parentId && !all.some((folder) => folder.id === folderData.parentId)) throw new Error('The destination folder no longer exists.');
        if (wouldCreateCycle(all, folderId, folderData.parentId ?? null)) throw new Error('A folder cannot be moved into itself or one of its own subfolders.');
        const problem = checkFolderName(current.name, folderData.parentId, all, folderId);
        if (problem) throw new Error(problem);
    }
    await updateDoc(doc(db, FOLDERS_COLLECTION, folderId), changes);
}

/**
 * Deletes folders without losing what is inside them. A folder's contacts move up to its parent folder
 * (or Miscellaneous at the top level) and its subfolders move up one level, all in one batch with the
 * delete, so no contact is left pointing at a folder that no longer exists.
 */
export async function deleteFolders(folderIds: string[]): Promise<void> {
    const db = getDb();
    if (folderIds.length === 0) return;
    const orgId = await getCurrentOrgId();
    const all = await getFolders();
    const batch = writeBatch(db);
    const deleting = new Set(folderIds);
    const miscellaneousId = all.find((folder) => folder.isSystem && folder.name.toLowerCase() === 'miscellaneous')?.id;

    for (const id of folderIds) {
        const plan = planFolderDelete(all, id);
        if (plan.error !== null) throw new Error(plan.error);
        // Where things go must not be a folder that is being deleted in the same call.
        let contactsTo: string | undefined = plan.contactsTo;
        while (contactsTo && deleting.has(contactsTo)) {
            contactsTo = all.find((folder) => folder.id === contactsTo)?.parentId || miscellaneousId;
        }
        let childrenTo: string | null = plan.childrenTo;
        while (childrenTo && deleting.has(childrenTo)) {
            childrenTo = all.find((folder) => folder.id === childrenTo)?.parentId ?? null;
        }
        if (!contactsTo) throw new Error('There is no folder to move its contacts into. Reload and try again.');

        const contacts = await getDocs(query(collection(db, CONTACTS_COLLECTION), where('orgId', '==', orgId), where('folderId', '==', id)));
        contacts.forEach((contactDoc) => batch.update(contactDoc.ref, { folderId: contactsTo }));
        plan.childIds
            .filter((childId) => !deleting.has(childId))
            .forEach((childId) => batch.update(doc(db, FOLDERS_COLLECTION, childId), { parentId: childrenTo }));
        batch.delete(doc(db, FOLDERS_COLLECTION, id));
    }

    await batch.commit();
}

/**
 * Ensures that mandated system folders exist for the user.
 * This function is self-healing: it merges duplicates and reassigns contacts to a single master record.
 */
export async function ensureSystemFolders(userId: string): Promise<FolderData[]> {
    const db = getDb();
    const orgId = await getCurrentOrgId();
    const q = query(collection(db, FOLDERS_COLLECTION), where("orgId", "==", orgId));
    const snapshot = await getDocs(q);
    const existing = snapshot.docs.map(docToFolder);

    // Mandated System Taxonomy
    const systemFoldersConfig = SYSTEM_FOLDERS;

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
                    const contactsQuery = query(collection(db, CONTACTS_COLLECTION), where("orgId", "==", orgId), where("folderId", "==", dupe.id));
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
                orgId,
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
