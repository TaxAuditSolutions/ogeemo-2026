
'use client';

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { getContactById } from '@/services/contact-service';

const SUPPLIERS_COLLECTION = 'suppliers';

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  userId: string;
}

async function getDb() {
  const { db } = await initializeFirebase();
  return db;
}

const docToSupplier = (doc: any): Supplier => ({
    id: doc.id,
    ...doc.data(),
} as Supplier);

export async function getSuppliers(userId: string): Promise<Supplier[]> {
    const db = await getDb();
    const q = query(collection(db, SUPPLIERS_COLLECTION), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToSupplier).sort((a,b) => a.name.localeCompare(b.name));
}


/**
 * Designates an existing contact as a supplier.
 * This is a placeholder function and will be expanded upon.
 */
export async function designateContactAsSupplier(userId: string, contactId: string): Promise<void> {
  const db = await getDb();
  
  const contact = await getContactById(contactId);
  if (!contact) {
      throw new Error("Contact not found.");
  }
  
  const supplierData: Omit<Supplier, 'id'> = {
      name: contact.businessName || contact.name,
      contactPerson: contact.name,
      email: contact.email,
      phone: contact.cellPhone || contact.businessPhone || contact.homePhone,
      userId: userId,
  };

  await setDoc(doc(db, SUPPLIERS_COLLECTION, contactId), supplierData, { merge: true });
}
