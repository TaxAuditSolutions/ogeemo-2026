
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
    getDoc,
} from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';
import type { Contact } from '@/data/contacts';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const CONTACTS_COLLECTION = 'contacts';
const CLIENT_ACCOUNTS_COLLECTION = 'clientAccounts';

interface ClientAccount {
  id: string;
  name: string;
  contactId: string;
  userId: string;
  createdAt: Date;
}

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


// --- Client Account Function (New) ---
async function createClientAccount(userId: string, contactId: string, contactName: string): Promise<void> {
    const db = getDb();
    const q = query(collection(db, CLIENT_ACCOUNTS_COLLECTION), where("contactId", "==", contactId), where("userId", "==", userId));
    const existingAccount = await getDocs(q);

    if (existingAccount.empty) {
      const accountData = {
          name: contactName,
          contactId,
          userId,
          createdAt: new Date(),
      };
      addDoc(collection(db, CLIENT_ACCOUNTS_COLLECTION), accountData).catch(serverError => {
          const permissionError = new FirestorePermissionError({
              path: collection(db, CLIENT_ACCOUNTS_COLLECTION).path,
              operation: 'create',
              requestResourceData: accountData
          });
          errorEmitter.emit('permission-error', permissionError);
          // We don't reject here as this is a secondary operation
          console.error("Failed to create client account (non-critical):", serverError);
      });
    }
}


// --- Contact functions ---
export async function getContacts(userId: string): Promise<Contact[]> {
  const db = getDb();
  const q = query(collection(db, CONTACTS_COLLECTION), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToContact);
}

export async function getContactById(contactId: string): Promise<Contact | null> {
    const db = getDb();
    const docRef = doc(db, CONTACTS_COLLECTION, contactId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docToContact(docSnap);
    }
    return null;
}


export function addContact(contactData: Omit<Contact, 'id'>): Promise<Contact> {
  return new Promise(async (resolve, reject) => {
    const db = getDb();
    const collectionRef = collection(db, CONTACTS_COLLECTION);
    const dataToSave = {
      ...contactData,
      website: contactData.website || '',
      businessName: contactData.businessName || '',
      email: contactData.email || '',
      industryCode: contactData.industryCode || '',
      keywords: generateKeywords(contactData.name, contactData.email || '', contactData.businessName),
    };

    addDoc(collectionRef, dataToSave)
      .then(async (docRef) => {
        const newContact = { id: docRef.id, ...dataToSave };
        await createClientAccount(contactData.userId, docRef.id, contactData.name);
        resolve(newContact);
      })
      .catch(serverError => {
        const permissionError = new FirestorePermissionError({
          path: collectionRef.path,
          operation: 'create',
          requestResourceData: dataToSave,
        });
        errorEmitter.emit('permission-error', permissionError);
        reject(serverError);
      });
  });
}

export function updateContact(contactId: string, contactData: Partial<Omit<Contact, 'id' | 'userId'>>): Promise<void> {
    return new Promise(async (resolve, reject) => {
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

        updateDoc(contactRef, dataToUpdate)
            .then(() => resolve())
            .catch(serverError => {
                const permissionError = new FirestorePermissionError({
                    path: contactRef.path,
                    operation: 'update',
                    requestResourceData: dataToUpdate,
                });
                errorEmitter.emit('permission-error', permissionError);
                reject(serverError);
            });
    });
}


export function deleteContacts(contactIds: string[]): Promise<void> {
    return new Promise(async (resolve, reject) => {
        const db = getDb();
        if (contactIds.length === 0) {
            resolve();
            return;
        }
        const batch = writeBatch(db);
        
        for (let i = 0; i < contactIds.length; i += 30) {
          const chunk = contactIds.slice(i, i + 30);
          const accountsQuery = query(collection(db, CLIENT_ACCOUNTS_COLLECTION), where('contactId', 'in', chunk));
          const accountsSnapshot = await getDocs(accountsQuery);
          accountsSnapshot.forEach(accountDoc => {
              batch.delete(accountDoc.ref);
          });
        }
        
        contactIds.forEach(id => {
            const contactRef = doc(db, CONTACTS_COLLECTION, id);
            batch.delete(contactRef);
        });

        batch.commit()
            .then(() => resolve())
            .catch(serverError => {
                const permissionError = new FirestorePermissionError({
                    path: `batch delete on ${CONTACTS_COLLECTION} and ${CLIENT_ACCOUNTS_COLLECTION}`,
                    operation: 'delete',
                    requestResourceData: { ids: contactIds },
                });
                errorEmitter.emit('permission-error', permissionError);
                reject(serverError);
            });
    });
}


export function mergeContacts(sourceContactId: string, masterContactId: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
        const db = getDb();
        const sourceRef = doc(db, CONTACTS_COLLECTION, sourceContactId);
        
        deleteDoc(sourceRef)
            .then(() => resolve())
            .catch(serverError => {
                const permissionError = new FirestorePermissionError({
                    path: sourceRef.path,
                    operation: 'delete',
                });
                errorEmitter.emit('permission-error', permissionError);
                reject(serverError);
            });
    });
}


export async function findOrCreateFolder(userId: string, folderName: string): Promise<FolderData> {
    const db = getDb();
    const FOLDERS_COLLECTION = 'contactFolders';
    const q = query(collection(db, FOLDERS_COLLECTION), where("userId", "==", userId), where("name", "==", folderName));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as FolderData;
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
