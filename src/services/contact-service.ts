
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
import { initializeFirebase } from '@/lib/firebase';
import type { Contact } from '@/data/contacts';

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
async function getDb() {
    const { db } = await initializeFirebase();
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
    const db = await getDb();
    const q = query(collection(db, CLIENT_ACCOUNTS_COLLECTION), where("contactId", "==", contactId), where("userId", "==", userId));
    const existingAccount = await getDocs(q);

    if (existingAccount.empty) {
      const accountData = {
          name: contactName,
          contactId,
          userId,
          createdAt: new Date(),
      };
      await addDoc(collection(db, CLIENT_ACCOUNTS_COLLECTION), accountData);
    }
}


// --- Contact functions ---
export async function getContacts(userId: string): Promise<Contact[]> {
  const db = await getDb();
  const q = query(collection(db, CONTACTS_COLLECTION), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToContact);
}

export async function addContact(contactData: Omit<Contact, 'id'>): Promise<Contact> {
  const db = await getDb();
  const dataToSave = {
    ...contactData,
    website: contactData.website || '',
    businessName: contactData.businessName || '',
    email: contactData.email || '',
    industryCode: contactData.industryCode || '',
    keywords: generateKeywords(contactData.name, contactData.email || '', contactData.businessName),
  };

  const docRef = await addDoc(collection(db, CONTACTS_COLLECTION), dataToSave);
  
  await createClientAccount(contactData.userId, docRef.id, contactData.name);

  return { id: docRef.id, ...dataToSave };
}

export async function updateContact(contactId: string, contactData: Partial<Omit<Contact, 'id' | 'userId'>>): Promise<void> {
    const db = await getDb();
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

    await updateDoc(contactRef, dataToUpdate);
}


export async function deleteContacts(contactIds: string[]): Promise<void> {
    const db = await getDb();
    if (contactIds.length === 0) return;
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

    await batch.commit();
}


// This function has been deprecated and its functionality moved to contact-folder-service.
// It is kept here to avoid breaking imports but should not be used.
export async function findOrCreateFolder(userId: string, folderName: string) {
    console.warn("findOrCreateFolder is deprecated. Use services from contact-folder-service instead.");
    // This function will now do nothing to prevent unintended side-effects.
    return { id: 'deprecated', name: folderName, userId, parentId: null, createdAt: new Date() };
}
