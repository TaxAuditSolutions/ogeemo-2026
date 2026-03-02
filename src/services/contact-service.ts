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

const CONTACTS_COLLECTION = 'contacts';
const CLIENT_ACCOUNTS_COLLECTION = 'clientAccounts';

// --- Helper Functions ---
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

const generateKeywords = (name: string, email: string, businessName?: string): string[] => {
    const keywords = new Set<string>();
    
    const addValue = (value: string | undefined) => {
        if (!value) return;
        const lowerCaseValue = value.toLowerCase();
        keywords.add(lowerCaseValue);
        lowerCaseValue.split(/[\s@.-]+/).forEach(part => {
            if (part) keywords.add(part);
        });
    };

    addValue(name);
    addValue(email);
    addValue(businessName);
    
    return Array.from(keywords);
};

async function createClientAccount(userId: string, contactId: string, contactName: string): Promise<void> {
    const db = getDb();
    const collectionRef = collection(db, CLIENT_ACCOUNTS_COLLECTION);
    const accountData = {
        name: contactName,
        contactId,
        userId,
        createdAt: new Date(),
    };

    addDoc(collectionRef, accountData).catch(async (error) => {
        if (error.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: collectionRef.path,
                operation: 'create',
                requestResourceData: accountData,
            } satisfies SecurityRuleContext));
        }
    });
}

/**
 * Fetches contacts from the directory.
 * @param userId Optional. If provided, filters by the creator's ID. Otherwise, fetches all accessible contacts.
 */
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
        if (docSnap.exists()) {
            return docToContact(docSnap);
        }
        return null;
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
    const collectionRef = collection(db, CONTACTS_COLLECTION);
    const docRef = doc(collectionRef);
    
    const dataToSave = {
      ...contactData,
      website: contactData.website || '',
      businessName: contactData.businessName || '',
      email: contactData.email || '',
      industryCode: contactData.industryCode || '',
      status: contactData.status || 'Unscheduled Leads',
      keywords: generateKeywords(contactData.name, contactData.email || '', contactData.businessName),
    };

    setDoc(docRef, dataToSave).catch(async (error) => {
        if (error.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: docRef.path,
                operation: 'create',
                requestResourceData: dataToSave,
            } satisfies SecurityRuleContext));
        }
    });

    createClientAccount(contactData.userId, docRef.id, contactData.name);
    return { id: docRef.id, ...dataToSave };
}

export async function updateContact(contactId: string, contactData: Partial<Omit<Contact, 'id' | 'userId'>>): Promise<void> {
    const db = getDb();
    const contactRef = doc(db, CONTACTS_COLLECTION, contactId);

    const dataToUpdate: {[key: string]: any} = { ...contactData };
    
    if (contactData.name || contactData.email || contactData.businessName) {
        const currentDoc = await getDoc(contactRef);
        if (currentDoc.exists()) {
            const currentData = currentDoc.data();
            const newName = contactData.name ?? currentData.name;
            const newEmail = contactData.email ?? currentData.email;
            const newBusinessName = contactData.businessName ?? currentData.businessName;
            dataToUpdate.keywords = generateKeywords(newName, newEmail, newBusinessName);
        }
    }

    updateDoc(contactRef, dataToUpdate).catch(async (error) => {
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
    
    contactIds.forEach(id => {
        const contactRef = doc(db, CONTACTS_COLLECTION, id);
        batch.delete(contactRef);
    });

    batch.commit().catch(async (error) => {
        if (error.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: 'batch',
                operation: 'delete',
            } satisfies SecurityRuleContext));
        }
    });
}

export async function mergeContacts(sourceContactId: string, masterContactId: string): Promise<void> {
    const db = getDb();
    const sourceRef = doc(db, CONTACTS_COLLECTION, sourceContactId);
    deleteDoc(sourceRef).catch(async (error) => {
        if (error.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: sourceRef.path,
                operation: 'delete',
            } satisfies SecurityRuleContext));
        }
    });
}

export async function findOrCreateFolder(userId: string, folderName: string): Promise<any> {
    const db = getDb();
    const FOLDERS_COLLECTION = 'contactFolders';
    const q = query(collection(db, FOLDERS_COLLECTION), where("userId", "==", userId), where("name", "==", folderName));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    }

    const newFolderData = {
        name: folderName,
        userId,
        parentId: null,
        createdAt: new Date()
    };
    const docRef = await addDoc(collection(db, FOLDERS_COLLECTION), newFolderData);
    return { id: docRef.id, ...newFolderData };
}
