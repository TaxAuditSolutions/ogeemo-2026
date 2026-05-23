
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

export type { Contact };

const CONTACTS_COLLECTION = 'contacts';
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
    const orgId = tokenResult.claims.orgId;

    if (typeof orgId !== 'string' || !orgId.trim()) {
        throw new Error('Authenticated user is missing an orgId claim.');
    }

    return orgId;
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

/**
 * High-fidelity search indexing for all identity roles.
 */
const generateKeywords = (data: Partial<Contact>): string[] => {
    const keywords = new Set<string>();

    const addValue = (value: any) => {
        if (!value || typeof value !== 'string') return;
        const lowerCaseValue = value.toLowerCase();
        keywords.add(lowerCaseValue);
        lowerCaseValue.split(/[\s@.-]+/).forEach(part => { if (part) keywords.add(part); });
    };

    addValue(data.name);
    addValue(data.email);
    addValue(data.businessName);
    addValue(data.employeeNumber);
    addValue(data.sin);

    return Array.from(keywords);
};

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

    const dataToSave = prepareContactDataForWrite({
        ...contactData,
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
    });

    return mapContactDataToContact(docRef.id, dataToSave);
}

export async function updateContact(contactId: string, contactData: Partial<Omit<Contact, 'id' | 'userId'>>): Promise<void> {
    const db = getDb();
    const contactRef = doc(db, CONTACTS_COLLECTION, contactId);
    const currentUser = getCurrentAuthContext();
    const orgId = await getCurrentOrgId();

    // Data Cleaning: Strip undefined and ensure restricted identifiers aren't in the payload
    const cleanedData: Record<string, any> = {};
    Object.keys(contactData).forEach(key => {
        const val = (contactData as any)[key];
        if (val !== undefined && key !== 'id' && key !== 'userId' && key !== 'createdAt' && key !== 'createdBy') {
            cleanedData[key] = val;
        }
    });

    const currentDoc = await getDoc(contactRef);
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
            const docFolderId = await provisionWorkerDocumentNode(userId, finalName, finalFolderId);
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
        });
    }
}

export async function deleteContacts(contactIds: string[]): Promise<void> {
    const db = getDb();
    if (contactIds.length === 0) return;
    const orgId = await getCurrentOrgId();
    const batch = writeBatch(db);

    for (const id of contactIds) {
        const contactRef = doc(db, CONTACTS_COLLECTION, id);
        const contactSnap = await getDoc(contactRef);

        if (contactSnap.exists() && contactSnap.data().orgId === orgId) {
            batch.delete(contactRef);
        }
    }

    await batch.commit();
}

export async function mergeContacts(sourceContactId: string, masterContactId: string): Promise<void> {
    const db = getDb();
    const orgId = await getCurrentOrgId();
    const sourceRef = doc(db, CONTACTS_COLLECTION, sourceContactId);
    const sourceSnap = await getDoc(sourceRef);

    if (sourceSnap.exists() && sourceSnap.data().orgId === orgId) {
        await deleteDoc(sourceRef);
    }
}
