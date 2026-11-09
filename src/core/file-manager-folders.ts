
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
    getDoc,
    deleteField,
    type WriteBatch
} from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';
import { getFolders as getContactFolders } from '@/services/contact-folder-service';
import { chunkItems } from '@/lib/contact-merge';
import { checkOptionalDriveLink } from '@/lib/drive-links';
import { DOCUMENT_SYSTEM_FOLDERS, checkDocumentFolderName, cleanName, folderMoveProblem } from '@/lib/document-folder-rules';
import { planDocumentFolderDelete } from '@/lib/document-folder-delete';
import { pickMasterFolder, planDuplicateMerge, planOrphanRepair, planWorkerFolder, systemFolderId } from '@/lib/document-folder-system';

export interface FolderItem {
    id: string;
    name: string;
    type: 'folder';
    parentId: string | null;
    userId: string;
    orgId?: string;
    createdBy?: string;
    updatedBy?: string;
    createdAt: Date;
    updatedAt?: Date;
    isSystem?: boolean;
    driveLink?: string;
}

const FOLDERS_COLLECTION = 'fileManagerFolders';
const FILES_COLLECTION = 'files';

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
    let tokenResult;
    try {
        tokenResult = await currentUser.getIdTokenResult();
    } catch (error) {
        console.warn('File manager: unable to read auth claims; falling back to user profile org lookup.', error);
    }

    const claimedOrgId = tokenResult?.claims?.orgId;

    if (typeof claimedOrgId === 'string' && claimedOrgId.trim()) {
        return claimedOrgId;
    }

    const db = getDb();
    const userProfileRef = doc(db, 'users', currentUser.uid);
    const userProfileSnap = await getDoc(userProfileRef);
    const profileOrgId = userProfileSnap.data()?.orgId;

    if (typeof profileOrgId === 'string' && profileOrgId.trim()) {
        return profileOrgId;
    }

    throw new Error('Authenticated user is missing an orgId claim and profile orgId.');
}

const docToFolder = (doc: any): FolderItem => ({
    id: doc.id,
    type: 'folder',
    ...doc.data(),
    createdAt: (doc.data().createdAt as Timestamp)?.toDate() || new Date(),
    updatedAt: (doc.data().updatedAt as Timestamp)?.toDate() || doc.data().updatedAt,
} as FolderItem);


export async function getFolders(userId: string): Promise<FolderItem[]> {
    const db = getDb();
    const orgId = await getCurrentOrgId();
    const q = query(collection(db, FOLDERS_COLLECTION), where("orgId", "==", orgId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToFolder);
}

const BATCH_SIZE = 400;
type BatchOp = (batch: WriteBatch) => void;

/** Runs the operations in order, in batches that stay under Firestore's 500-write limit. */
async function commitOps(ops: BatchOp[]): Promise<void> {
    const db = getDb();
    for (const chunk of chunkItems(ops, BATCH_SIZE)) {
        const batch = writeBatch(db);
        chunk.forEach(op => op(batch));
        await batch.commit();
    }
}

async function loadOrgFolders(orgId: string): Promise<FolderItem[]> {
    const snapshot = await getDocs(query(collection(getDb(), FOLDERS_COLLECTION), where("orgId", "==", orgId)));
    return snapshot.docs.map(docToFolder);
}

async function loadOrgFiles(orgId: string): Promise<{ id: string; folderId: string | null }[]> {
    const snapshot = await getDocs(query(collection(getDb(), FILES_COLLECTION), where("orgId", "==", orgId)));
    return snapshot.docs.map(d => ({ id: d.id, folderId: (d.data().folderId as string | undefined) ?? null }));
}

async function createFolderRecord(
    data: { name: string; userId: string; parentId: string | null; driveLink?: string },
    orgId: string,
    uid: string
): Promise<FolderItem> {
    const record: Record<string, unknown> = {
        name: data.name,
        userId: data.userId,
        orgId,
        parentId: data.parentId,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: uid,
        updatedBy: uid,
    };
    if (data.driveLink) record.driveLink = data.driveLink;
    const docRef = await addDoc(collection(getDb(), FOLDERS_COLLECTION), record);
    return { id: docRef.id, type: 'folder', ...record } as FolderItem;
}

export async function addFolder(folderData: Omit<FolderItem, 'id' | 'createdAt' | 'type'>): Promise<FolderItem> {
    const orgId = await getCurrentOrgId();
    const currentUser = getCurrentAuthContext();
    const name = cleanName(folderData.name ?? '');
    const parentId = folderData.parentId || null;
    const existing = await loadOrgFolders(orgId);
    if (parentId && !existing.some(f => f.id === parentId)) throw new Error('The parent folder no longer exists.');
    const nameProblem = checkDocumentFolderName(name, parentId, existing);
    if (nameProblem) throw new Error(nameProblem);
    const link = checkOptionalDriveLink(folderData.driveLink);
    if (!link.ok) throw new Error(link.error);
    return createFolderRecord({ name, userId: folderData.userId, parentId, driveLink: link.href ?? undefined }, orgId, currentUser.uid);
}

export async function updateFolder(folderId: string, folderData: Partial<Omit<FolderItem, 'id' | 'userId' | 'type'>>): Promise<void> {
    const db = getDb();
    const orgId = await getCurrentOrgId();
    const currentUser = getCurrentAuthContext();
    const folderRef = doc(db, FOLDERS_COLLECTION, folderId);
    const snapshot = await getDoc(folderRef);
    if (!snapshot.exists() || snapshot.data().orgId !== orgId) throw new Error('That folder no longer exists.');

    const all = await loadOrgFolders(orgId);
    const current = all.find(f => f.id === folderId) as FolderItem;
    const update: Record<string, unknown> = {};

    if (folderData.name !== undefined) {
        const name = cleanName(folderData.name);
        if (current.isSystem && name.toLowerCase() !== current.name.toLowerCase()) {
            throw new Error(`"${current.name}" is a system folder and cannot be renamed.`);
        }
        const nameProblem = checkDocumentFolderName(name, current.parentId, all, folderId);
        if (nameProblem) throw new Error(nameProblem);
        update.name = name;
    }
    if ('parentId' in folderData) {
        const moveProblem = folderMoveProblem(all, folderId, folderData.parentId || null);
        if (moveProblem) throw new Error(moveProblem);
        update.parentId = folderData.parentId || null;
    }
    if ('driveLink' in folderData) {
        const link = checkOptionalDriveLink(folderData.driveLink);
        if (!link.ok) throw new Error(link.error);
        // Firestore refuses undefined, so removing a link deletes the field.
        update.driveLink = link.href ?? deleteField();
    }
    if (Object.keys(update).length === 0) return;
    await updateDoc(folderRef, { ...update, updatedBy: currentUser.uid, updatedAt: new Date() });
}

/**
 * Ensures the mandated system folders exist for the workspace. It is self-healing, and safe to run on every
 * visit:
 *  - a new system folder gets a fixed id (systemFolderId), so two people opening the page at the same moment
 *    write the SAME record instead of two copies;
 *  - when copies already exist, the master is the one already marked system, then the one under the right
 *    parent, then the oldest (pickMasterFolder), never just "the first one found";
 *  - a duplicate's files AND its subfolders move to the master before it is deleted, so nothing is left
 *    pointing at a folder that no longer exists;
 *  - all writes go out in batches under Firestore's limit.
 */
export async function ensureDocumentSystemFolders(userId: string): Promise<FolderItem[]> {
    const db = getDb();
    const orgId = await getCurrentOrgId();
    const currentUser = getCurrentAuthContext();
    const existing = await loadOrgFolders(orgId);
    const files = await loadOrgFiles(orgId);

    const legacyMap: Record<string, string> = { "employee workers": "Employees", "contract workers": "Contractors" };
    const stamp = () => ({ updatedBy: currentUser.uid, updatedAt: new Date() });
    const current = [...existing];
    const masters = new Map<string, FolderItem>();
    const ops: BatchOp[] = [];

    for (const config of DOCUMENT_SYSTEM_FOLDERS) {
        const key = config.name.toLowerCase();
        const matches = current.filter(f => f.name.trim().toLowerCase() === key || legacyMap[f.name.trim().toLowerCase()] === config.name);
        const parentMaster = config.parent ? masters.get(config.parent.toLowerCase()) : undefined;
        const expectedParentId = parentMaster?.id ?? null;
        let master: FolderItem | undefined = pickMasterFolder(matches, expectedParentId);

        if (master) {
            const found = master;
            const patch: Record<string, unknown> = {};
            if (found.name !== config.name) { patch.name = config.name; found.name = config.name; }
            if (!found.isSystem) { patch.isSystem = true; found.isSystem = true; }
            if (config.parent && parentMaster && found.parentId !== parentMaster.id) { patch.parentId = parentMaster.id; found.parentId = parentMaster.id; }
            if (Object.keys(patch).length > 0) ops.push(b => b.update(doc(db, FOLDERS_COLLECTION, found.id), { ...patch, ...stamp() }));

            const duplicateIds = matches.filter(m => m.id !== found.id).map(m => m.id);
            if (duplicateIds.length > 0) {
                const plan = planDuplicateMerge(current, files, found.id, duplicateIds);
                plan.fileIds.forEach(fileId => ops.push(b => b.update(doc(db, FILES_COLLECTION, fileId), { folderId: found.id, ...stamp() })));
                plan.childIds.forEach(childId => ops.push(b => b.update(doc(db, FOLDERS_COLLECTION, childId), { parentId: found.id, ...stamp() })));
                duplicateIds.forEach(dupeId => ops.push(b => b.delete(doc(db, FOLDERS_COLLECTION, dupeId))));
                const gone = new Set(duplicateIds);
                files.forEach(f => { if (f.folderId && gone.has(f.folderId)) f.folderId = found.id; });
                current.forEach(f => { if (f.parentId && gone.has(f.parentId)) f.parentId = found.id; });
                for (let i = current.length - 1; i >= 0; i--) if (gone.has(current[i].id)) current.splice(i, 1);
            }
        } else {
            const id = systemFolderId(orgId, config.name);
            const record: Record<string, unknown> = {
                name: config.name, userId, orgId, parentId: parentMaster?.id ?? null, isSystem: true,
                createdAt: new Date(), updatedAt: new Date(), createdBy: currentUser.uid, updatedBy: currentUser.uid,
            };
            ops.push(b => b.set(doc(db, FOLDERS_COLLECTION, id), record));
            master = { id, type: 'folder', ...record } as FolderItem;
            current.push(master);
        }
        masters.set(key, master);
    }

    // Anything still pointing at a folder that no longer exists is invisible in the tree: bring it back.
    const miscellaneous = masters.get('miscellaneous');
    const repair = planOrphanRepair(current, files, miscellaneous?.id ?? null);
    repair.fileIds.forEach(fileId => ops.push(b => b.update(doc(db, FILES_COLLECTION, fileId), { folderId: miscellaneous!.id, ...stamp() })));
    repair.folderIds.forEach(folderId => {
        ops.push(b => b.update(doc(db, FOLDERS_COLLECTION, folderId), { parentId: null, ...stamp() }));
        const folder = current.find(f => f.id === folderId);
        if (folder) folder.parentId = null;
    });

    if (ops.length > 0) await commitOps(ops);
    return current;
}

/**
 * Deletes folders without losing what is inside them: files and subfolders move up one level (or to
 * Miscellaneous at the top), and a contact whose document folder this was no longer points at it. Everything
 * is planned first, so a refusal changes nothing.
 */
export async function deleteFolders(folderIds: string[]): Promise<{ movedFiles: number; movedFolders: number }> {
    const summary = { movedFiles: 0, movedFolders: 0 };
    const ids = Array.from(new Set(folderIds));
    if (ids.length === 0) return summary;
    const db = getDb();
    const orgId = await getCurrentOrgId();
    const currentUser = getCurrentAuthContext();
    const stamp = () => ({ updatedBy: currentUser.uid, updatedAt: new Date() });
    let folders = await loadOrgFolders(orgId);
    let files = await loadOrgFiles(orgId);
    const ops: BatchOp[] = [];

    for (const id of ids) {
        const plan = planDocumentFolderDelete(folders, files, id);
        if (plan.error !== null) throw new Error(plan.error);
        plan.fileIds.forEach(fileId => ops.push(b => b.update(doc(db, FILES_COLLECTION, fileId), { folderId: plan.filesTo, ...stamp() })));
        plan.childIds.forEach(childId => ops.push(b => b.update(doc(db, FOLDERS_COLLECTION, childId), { parentId: plan.childrenTo, ...stamp() })));
        const contacts = await getDocs(query(collection(db, 'contacts'), where("orgId", "==", orgId), where("documentFolderId", "==", id)));
        contacts.forEach(contact => ops.push(b => b.update(contact.ref, { documentFolderId: deleteField() })));
        ops.push(b => b.delete(doc(db, FOLDERS_COLLECTION, id)));

        summary.movedFiles += plan.fileIds.length;
        summary.movedFolders += plan.childIds.length;
        files = files.map(f => (f.folderId === id ? { ...f, folderId: plan.filesTo } : f));
        folders = folders.filter(f => f.id !== id).map(f => (f.parentId === id ? { ...f, parentId: plan.childrenTo } : f));
    }
    await commitOps(ops);
    return summary;
}

export async function findOrCreateFileFolder(userId: string, folderName: string): Promise<FolderItem> {
    const db = getDb();
    const orgId = await getCurrentOrgId();
    const currentUser = getCurrentAuthContext();
    const q = query(collection(db, FOLDERS_COLLECTION), where("orgId", "==", orgId), where("name", "==", folderName));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
        return docToFolder(snapshot.docs[0]);
    }
    const newFolderData = { name: folderName, userId, orgId, parentId: null, createdAt: new Date(), updatedAt: new Date(), createdBy: currentUser.uid, updatedBy: currentUser.uid };
    const docRef = await addDoc(collection(db, FOLDERS_COLLECTION), newFolderData);
    return { id: docRef.id, type: 'folder', ...newFolderData };
}

/**
 * Provisions (or keeps) a worker's folder in the Document Manager: Workers -> [Employees/Contractors] -> [Name].
 * A contact that already has a folder keeps it, renamed or moved to the new role, so its files stay with it.
 * Returns the folder id, or null when the role does not get a folder.
 */
export async function provisionWorkerDocumentNode(
    userId: string,
    contactName: string,
    contactFolderId: string,
    existingFolderId?: string | null
): Promise<string | null> {
    const db = getDb();
    const orgId = await getCurrentOrgId();
    const currentUser = getCurrentAuthContext();
    const name = cleanName(contactName ?? '').slice(0, 120);
    if (!name) return null;

    const contactFolders = await getContactFolders(userId);
    const targetContactFolder = contactFolders.find(f => f.id === contactFolderId);
    if (!targetContactFolder) return null;
    const roleName = targetContactFolder.name;
    if (roleName !== 'Employees' && roleName !== 'Contractors') return null;

    const docFolders = await ensureDocumentSystemFolders(userId);
    const workersRoot = docFolders.find(f => f.name === 'Workers' && f.isSystem);
    if (!workersRoot) return null;
    const typeFolder = docFolders.find(f => f.name === roleName && f.parentId === workersRoot.id);
    if (!typeFolder) return null;

    const siblings = docFolders.filter(f => f.parentId === typeFolder.id).map(f => ({ id: f.id, name: f.name }));
    const existing = existingFolderId ? docFolders.find(f => f.id === existingFolderId) : undefined;
    const action = planWorkerFolder({
        name,
        roleParentId: typeFolder.id,
        existingFolder: existing ? { id: existing.id, name: existing.name, parentId: existing.parentId } : null,
        siblings,
    });

    if (action.action === 'keep') return action.folderId;
    if (action.action === 'update') {
        const update: Record<string, unknown> = { updatedBy: currentUser.uid, updatedAt: new Date() };
        if (action.name) update.name = action.name;
        if (action.parentId) update.parentId = action.parentId;
        await updateDoc(doc(db, FOLDERS_COLLECTION, action.folderId), update);
        return action.folderId;
    }
    const created = await createFolderRecord({ name: action.name, userId, parentId: action.parentId }, orgId, currentUser.uid);
    return created.id;
}
