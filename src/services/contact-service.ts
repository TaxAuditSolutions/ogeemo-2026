
'use client';

import {
    collection,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where,
    writeBatch,
    getDoc,
    setDoc,
    Timestamp,
} from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import type { Contact } from '@/data/contacts';
import { provisionWorkerDocumentNode } from '@/core/file-manager-folders';
import { isBlankRequiredContactField } from '@/lib/contact-update';
import { cleanContactInput } from '@/lib/contact-clean';
import { generateContactKeywords } from '@/lib/contact-keywords';
import { ContactInUseError, planContactDelete, tallyLinks, type LinkCounts, type LinkHit } from '@/lib/contact-links';
import { CONTACT_REFERENCES, buildMergePatch, chunkItems, groupReassignments } from '@/lib/contact-merge';

export type { Contact };

const CONTACTS_COLLECTION = 'contacts';
const CONTACT_FOLDERS_COLLECTION = 'contactFolders';
const CONTACT_DATE_FIELDS = ['birthDate', 'hireDate', 'startDate'] as const;
const CONTACT_METADATA_DATE_FIELDS = ['createdAt', 'updatedAt'] as const;

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
    const claimedOrgId = tokenResult.claims.orgId;

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

async function requireContactFolderId(folderId: unknown, orgId: string): Promise<string> {
    const normalizedFolderId = typeof folderId === 'string' ? folderId.trim() : '';
    if (!normalizedFolderId) {
        throw new Error('Role Assignment (Folder) is required.');
    }

    const folderSnapshot = await getDoc(doc(getDb(), CONTACT_FOLDERS_COLLECTION, normalizedFolderId));
    if (!folderSnapshot.exists() || folderSnapshot.data().orgId !== orgId) {
        throw new Error('Role Assignment must be a valid folder in the active organization.');
    }

    return normalizedFolderId;
}

function cloneDateWithToDate(value: Date): Date {
    const normalized = new Date(value.getTime());
    (normalized as Date & { toDate?: () => Date }).toDate = () => normalized;
    return normalized;
}

function toClientDate(value: any): Date | any {
    if (value instanceof Timestamp) {
        return cloneDateWithToDate(value.toDate());
    }

    if (value instanceof Date) {
        return cloneDateWithToDate(value);
    }

    if (value && typeof value.toDate === 'function') {
        return cloneDateWithToDate(value.toDate());
    }

    return value;
}

function toInputDateString(value: any): string | any {
    const normalized = toClientDate(value);

    if (normalized instanceof Date) {
        return normalized.toISOString().split('T')[0];
    }

    return normalized;
}

function toFirestoreDateValue(value: any): Date | any {
    if (value instanceof Timestamp) {
        return value.toDate();
    }

    if (value instanceof Date) {
        return value;
    }

    if (typeof value === 'string' && value.trim()) {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed;
        }
    }

    return value;
}

function mapContactDataToContact(id: string, data: any): Contact {
    const contact: any = { id, ...data };

    CONTACT_METADATA_DATE_FIELDS.forEach((field) => {
        contact[field] = toClientDate(contact[field]);
    });

    CONTACT_DATE_FIELDS.forEach((field) => {
        contact[field] = toInputDateString(contact[field]);
    });

    return contact as Contact;
}

const docToContact = (doc: any): Contact => mapContactDataToContact(doc.id, doc.data());

function prepareContactDataForWrite(contactData: Record<string, any>) {
    const dataToSave: Record<string, any> = {};

    Object.keys(contactData).forEach((key) => {
        const val = contactData[key];
        if (val !== undefined) {
            dataToSave[key] = val;
        }
    });

    CONTACT_DATE_FIELDS.forEach((field) => {
        if (field in dataToSave) {
            dataToSave[field] = toFirestoreDateValue(dataToSave[field]);
        }
    });

    return dataToSave;
}

/** Search indexing for all identity roles (shared with the Co-Pilot, see src/lib/contact-keywords.ts). */
const generateKeywords = generateContactKeywords;

export async function getContacts(_userId?: string): Promise<Contact[]> {
    const db = getDb();
    const collectionRef = collection(db, CONTACTS_COLLECTION);
    const orgId = await getCurrentOrgId();

    try {
        const q = query(collectionRef, where('orgId', '==', orgId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docToContact).sort((a, b) => a.name.localeCompare(b.name));
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: CONTACTS_COLLECTION,
                operation: 'list',
            } satisfies SecurityRuleContext));
        }
        throw error;
    }
}

export async function getContactById(contactId: string): Promise<Contact | null> {
    const db = getDb();
    const docRef = doc(db, CONTACTS_COLLECTION, contactId);
    try {
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            return null;
        }

        const orgId = await getCurrentOrgId();
        const contact = docToContact(docSnap);
        return contact.orgId === orgId ? contact : null;
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: docRef.path,
                operation: 'get',
            } satisfies SecurityRuleContext));
        }
        throw error;
    }
}

export async function addContact(contactData: Omit<Contact, 'id'>): Promise<Contact> {
    const db = getDb();
    const docRef = doc(collection(db, CONTACTS_COLLECTION));
    const currentUser = getCurrentAuthContext();
    const orgId = await getCurrentOrgId();
    const folderId = await requireContactFolderId(contactData.folderId, orgId);

    const dataToSave = prepareContactDataForWrite({
        ...cleanContactInput(contactData as Record<string, unknown>),
        folderId,
        orgId,
        createdBy: currentUser.uid,
        updatedBy: currentUser.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    dataToSave.keywords = generateKeywords(dataToSave);

    // Automate folder provisioning in Document Manager
    if (dataToSave.folderId && dataToSave.userId) {
        const docFolderId = await provisionWorkerDocumentNode(dataToSave.userId, dataToSave.name, dataToSave.folderId);
        if (docFolderId) {
            dataToSave.documentFolderId = docFolderId;
        }
    }

    await setDoc(docRef, dataToSave).catch(async (error) => {
        if (error.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: docRef.path,
                operation: 'create',
                requestResourceData: dataToSave,
            } satisfies SecurityRuleContext));
        }
        // Re-throw so callers surface the real failure ("Save Failed") instead
        // of a false "Contact Created" toast with nothing written to Firestore.
        console.error('[contact-service] addContact Firestore write failed:', error);
        throw error;
    });

    return mapContactDataToContact(docRef.id, dataToSave);
}

export async function updateContact(contactId: string, contactData: Partial<Omit<Contact, 'id' | 'userId'>>): Promise<void> {
    const db = getDb();
    const contactRef = doc(db, CONTACTS_COLLECTION, contactId);
    const currentUser = getCurrentAuthContext();
    const orgId = await getCurrentOrgId();
    const folderId = contactData.folderId === undefined
        ? undefined
        : await requireContactFolderId(contactData.folderId, orgId);

    // Names and emails are saved trimmed (and the email in lower case), so the same person is the same record.
    contactData = cleanContactInput(contactData as Record<string, unknown>) as typeof contactData;
    // Data Cleaning: Strip undefined and ensure restricted identifiers aren't in the payload
    const cleanedData: Record<string, any> = {};
    Object.keys(contactData).forEach(key => {
        const val = key === 'folderId' ? folderId : (contactData as any)[key];
        if (val !== undefined && key !== 'id' && key !== 'userId' && key !== 'createdAt' && key !== 'createdBy' && !isBlankRequiredContactField(key, val)) {
            cleanedData[key] = val;
        }
    });

    const currentDoc = await getDoc(contactRef);
    if (!currentDoc.exists()) throw new Error('This contact no longer exists. It may have been deleted or merged.');
    if (currentDoc.exists()) {
        const currentData = currentDoc.data();
        cleanedData.orgId = currentData.orgId || orgId;
        cleanedData.updatedBy = currentUser.uid;
        cleanedData.updatedAt = new Date();

        CONTACT_DATE_FIELDS.forEach((field) => {
            if (field in cleanedData) {
                cleanedData[field] = toFirestoreDateValue(cleanedData[field]);
            }
        });

        cleanedData.keywords = generateKeywords({ ...currentData, ...cleanedData });

        // Automate folder provisioning synchronization
        const finalName = cleanedData.name || currentData.name;
        const finalFolderId = cleanedData.folderId || currentData.folderId;
        const userId = currentData.userId;

        if (finalFolderId && userId) {
            const docFolderId = await provisionWorkerDocumentNode(userId, finalName, finalFolderId, currentData.documentFolderId);
            if (docFolderId) {
                cleanedData.documentFolderId = docFolderId;
            }
        }

        await updateDoc(contactRef, cleanedData).catch(async (error) => {
            if (error.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: contactRef.path,
                    operation: 'update',
                    requestResourceData: cleanedData,
                } satisfies SecurityRuleContext));
            }
            // Re-throw so the form reports "Save Failed" instead of a false "Contact Updated".
            console.error('[contact-service] updateContact Firestore write failed:', error);
            throw error;
        });
    }
}

/**
 * Counts the records that still name each contact, across every collection that stores a contact id
 * (the same list the merge re-points). One query per collection and field, not per contact, so this
 * stays fast for a bulk delete. A record that names the contact in two fields counts once.
 */
export async function getContactLinks(contactIds: readonly string[]): Promise<Record<string, LinkCounts>> {
    if (contactIds.length === 0) return {};
    const db = getDb();
    const orgId = await getCurrentOrgId();
    const wanted = new Set(contactIds);
    const hits: LinkHit[] = [];

    for (const reference of CONTACT_REFERENCES) {
        const snapshot = await getDocs(query(collection(db, reference.collection), where('orgId', '==', orgId)));
        snapshot.forEach((found) => {
            const value = found.data()[reference.field];
            if (typeof value === 'string' && wanted.has(value)) {
                hits.push({ contactId: value, collection: reference.collection, docId: found.id });
            }
        });
    }
    return tallyLinks(hits);
}

/**
 * Deletes contacts, but only ones nothing depends on. A contact that is still named by a task, project,
 * quote, invoice, work order, time log, leave request or inventory item is refused with a
 * ContactInUseError that says what uses it, and NOTHING is deleted in that case (not even the free ones
 * in the same call), so a bulk delete is all or nothing. Merge the contact into another one instead.
 */
export async function deleteContacts(contactIds: string[]): Promise<void> {
    const db = getDb();
    const ids = Array.from(new Set(contactIds));
    if (ids.length === 0) return;
    const orgId = await getCurrentOrgId();

    const snaps = await Promise.all(ids.map((id) => getDoc(doc(db, CONTACTS_COLLECTION, id))));
    const mine = snaps.flatMap((snap) => {
        const data = snap.data();
        return snap.exists() && data && data.orgId === orgId ? [{ id: snap.id, name: String(data.name ?? '') }] : [];
    });
    if (mine.length === 0) return;

    // A sign-in account linked to the contact would be left pointing at nothing.
    for (const person of mine) {
        const linked = await getDocs(query(collection(db, 'users'), where('orgId', '==', orgId), where('contactId', '==', person.id)));
        if (!linked.empty) {
            const who = linked.docs[0].data().displayName || linked.docs[0].data().email || 'a sign-in account';
            throw new Error(`"${person.name}" is linked to ${who} and cannot be deleted. Remove the sign-in account first.`);
        }
    }

    // Work that still names the contact: refuse, and say what.
    const links = await getContactLinks(mine.map((person) => person.id));
    const plan = planContactDelete(mine, links);
    if (plan.blocked.length > 0) throw new ContactInUseError(plan.blocked);

    // Several batches, because one batch holds at most 500 writes.
    for (const chunk of chunkItems(plan.deletable)) {
        const batch = writeBatch(db);
        for (const id of chunk) batch.delete(doc(db, CONTACTS_COLLECTION, id));
        await batch.commit();
    }
}

export interface MergeContactsResult {
    /** Linked records re-pointed at the master, by collection. */
    reassigned: Record<string, number>;
    /** Number of master fields filled from the duplicate. */
    detailsCopied: number;
}

/**
 * Merges a duplicate contact into a master contact without orphaning work.
 *
 * Order matters for safety: (1) validate both contacts, (2) re-point every
 * record that references the duplicate at the master, (3) copy blank details
 * across, and only then (4) delete the duplicate. If any step before the delete
 * fails, the duplicate is left in place and nothing is lost; re-running the
 * merge is safe because already re-pointed records no longer match.
 */
export async function mergeContacts(sourceContactId: string, masterContactId: string): Promise<MergeContactsResult> {
    if (!sourceContactId || !masterContactId) throw new Error('Choose both a duplicate and a master contact.');
    if (sourceContactId === masterContactId) throw new Error('A contact cannot be merged into itself.');

    const db = getDb();
    const orgId = await getCurrentOrgId();
    const currentUser = getCurrentAuthContext();
    const sourceRef = doc(db, CONTACTS_COLLECTION, sourceContactId);
    const masterRef = doc(db, CONTACTS_COLLECTION, masterContactId);
    const [sourceSnap, masterSnap] = await Promise.all([getDoc(sourceRef), getDoc(masterRef)]);

    if (!sourceSnap.exists() || sourceSnap.data().orgId !== orgId) {
        throw new Error('The duplicate contact was not found in this organization.');
    }
    if (!masterSnap.exists() || masterSnap.data().orgId !== orgId) {
        throw new Error('The master contact was not found in this organization.');
    }

    // A sign-in account can be linked to a contact (users.contactId). Re-pointing
    // it needs an administrator, and silently deleting the contact would leave
    // the account linked to nothing, so stop before changing anything.
    const linkedAccounts = await getDocs(
        query(collection(db, 'users'), where('orgId', '==', orgId), where('contactId', '==', sourceContactId)),
    );
    if (!linkedAccounts.empty) {
        const who = linkedAccounts.docs[0].data().displayName || linkedAccounts.docs[0].data().email || 'a sign-in account';
        throw new Error(
            `"${sourceSnap.data().name}" is linked to ${who}, so it cannot be merged away. Merge the other way round (keep this contact), or ask an administrator to unlink the account first.`,
        );
    }

    // (2) Find every record that points at the duplicate.
    const hits: { path: string; collection: string; field: string }[] = [];
    for (const reference of CONTACT_REFERENCES) {
        const snapshot = await getDocs(
            query(
                collection(db, reference.collection),
                where('orgId', '==', orgId),
                where(reference.field, '==', sourceContactId),
            ),
        );
        snapshot.forEach((found) => hits.push({ path: found.ref.path, collection: reference.collection, field: reference.field }));
    }

    const pending = groupReassignments(hits);
    const reassigned: Record<string, number> = {};
    for (const batchOfUpdates of chunkItems(pending)) {
        const batch = writeBatch(db);
        for (const update of batchOfUpdates) {
            const fields: Record<string, unknown> = { updatedBy: currentUser.uid, updatedAt: new Date() };
            for (const field of update.fields) fields[field] = masterContactId;
            batch.update(doc(db, update.path), fields);
            reassigned[update.collection] = (reassigned[update.collection] ?? 0) + 1;
        }
        await batch.commit();
    }

    // (3) Keep useful details from the duplicate, never overwriting the master's own.
    const patch = buildMergePatch(masterSnap.data(), sourceSnap.data());
    const detailsCopied = Object.keys(patch).length;
    if (detailsCopied > 0) await updateContact(masterContactId, patch as Partial<Omit<Contact, 'id' | 'userId'>>);

    // (4) Only now remove the duplicate.
    await deleteDoc(sourceRef);
    return { reassigned, detailsCopied };
}
