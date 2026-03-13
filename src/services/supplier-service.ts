'use client';

import {
  collection,
  doc,
  query,
  where,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';
import { type Contact } from '@/data/contacts';

/**
 * @fileOverview Refactored Supplier Service for Ogeemo.
 * Consolidates 'Suppliers' into the Contact Hub as the Single Source of Truth.
 */

export type Supplier = Contact;

const CONTACTS_COLLECTION = 'contacts';
const FOLDERS_COLLECTION = 'contactFolders';

function getDb() {
  const { db } = getFirebaseServices();
  return db;
}

const docToSupplier = (doc: any): Supplier => ({
    id: doc.id,
    ...doc.data(),
} as Supplier);

/**
 * Fetches all suppliers from the Contact Hub for the current user.
 */
export async function getSuppliers(userId: string): Promise<Supplier[]> {
    const db = getDb();
    
    if (!userId || typeof userId !== 'string') return [];

    // 1. Find the 'Suppliers' folders for THIS user
    const foldersRef = collection(db, FOLDERS_COLLECTION);
    const foldersQuery = query(foldersRef, where("userId", "==", userId), where("name", "==", "Suppliers"));
    const foldersSnapshot = await getDocs(foldersQuery);
    
    const supplierFolderIds = foldersSnapshot.docs.map(d => d.id);
        
    if (supplierFolderIds.length === 0) return [];

    // 2. Pull contacts from those specific folders
    const contactsRef = collection(db, CONTACTS_COLLECTION);
    const q = query(contactsRef, where("folderId", "in", supplierFolderIds));
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToSupplier).sort((a,b) => a.name.localeCompare(b.name));
}

/**
 * Moves an existing contact into the user's 'Suppliers' system folder.
 */
export async function designateContactAsSupplier(userId: string, contactId: string): Promise<Supplier> {
  const db = getDb();
  
  if (!userId) throw new Error("Unauthorized");

  const foldersQuery = query(collection(db, FOLDERS_COLLECTION), where("userId", "==", userId), where("name", "==", "Suppliers"));
  const foldersSnapshot = await getDocs(foldersQuery);
  
  if (foldersSnapshot.empty) throw new Error("Suppliers system folder not found.");
  const supplierFolderId = foldersSnapshot.docs[0].id;

  const contactRef = doc(db, CONTACTS_COLLECTION, contactId);
  await updateDoc(contactRef, { folderId: supplierFolderId });
  
  return { id: contactId, folderId: supplierFolderId } as Supplier;
}
