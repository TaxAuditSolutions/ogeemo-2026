
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
    getDoc,
    setDoc,
} from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import type { Contact } from '@/data/contacts';
import { provisionWorkerDocumentNode } from '@/core/file-manager-folders';

export type { Contact };

const CONTACTS_COLLECTION = 'contacts';

function getDb() {
    const { db } = getFirebaseServices();
    return db;
}

const docToContact = (doc: any): Contact => {
    const data = doc.data();
    return { 
        id: doc.id, 
        ...data,
    } as Contact;
};

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

export async function getContacts(userId?: string): Promise<Contact[]> {
  const db = getDb();
  const collectionRef = collection(db, CONTACTS_COLLECTION);
  
  // High-Fidelity Query Scoping: Defend against 'undefined' in where clauses
  const q = (userId && typeof userId === 'string') 
    ? query(collectionRef, where("userId", "==", userId)) 
    : collectionRef;
  
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToContact).sort((a,b) => a.name.localeCompare(b.name));
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
        return docSnap.exists() ? docToContact(docSnap) : null;
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
    
    // Data Cleaning: Remove undefined values common in form results
    const dataToSave: any = {};
    Object.keys(contactData).forEach(key => {
        const val = (contactData as any)[key];
        if (val !== undefined) {
            dataToSave[key] = val;
        }
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

    return { id: docRef.id, ...dataToSave };
}

export async function updateContact(contactId: string, contactData: Partial<Omit<Contact, 'id' | 'userId'>>): Promise<void> {
    const db = getDb();
    const contactRef = doc(db, CONTACTS_COLLECTION, contactId);

    // Data Cleaning: Strip undefined and ensure restricted identifiers aren't in the payload
    const cleanedData: any = {};
    Object.keys(contactData).forEach(key => {
        const val = (contactData as any)[key];
        if (val !== undefined && key !== 'id' && key !== 'userId') {
            cleanedData[key] = val;
        }
    });
    
    const currentDoc = await getDoc(contactRef);
    if (currentDoc.exists()) {
        const currentData = currentDoc.data();
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
    const batch = writeBatch(db);
    contactIds.forEach(id => batch.delete(doc(db, CONTACTS_COLLECTION, id)));
    await batch.commit();
}

export async function mergeContacts(sourceContactId: string, masterContactId: string): Promise<void> {
    const db = getDb();
    await deleteDoc(doc(db, CONTACTS_COLLECTION, sourceContactId));
}
