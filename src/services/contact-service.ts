
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

export type { Contact };

const CONTACTS_COLLECTION = 'contacts';
const CLIENT_ACCOUNTS_COLLECTION = 'clientAccounts';

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
  const q = userId ? query(collectionRef, where("userId", "==", userId)) : collectionRef;
  
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
    
    const dataToSave = {
      ...contactData,
      keywords: generateKeywords(contactData),
    };

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

    const dataToUpdate: any = { ...contactData };
    
    const currentDoc = await getDoc(contactRef);
    if (currentDoc.exists()) {
        const currentData = currentDoc.data();
        dataToUpdate.keywords = generateKeywords({ ...currentData, ...contactData });
    }

    await updateDoc(contactRef, dataToUpdate).catch(async (error) => {
        if (error.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: contactRef.path,
                operation: 'update',
                requestResourceData: dataToUpdate,
            } satisfies SecurityRuleContext));
        }
    });
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
