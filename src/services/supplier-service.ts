
'use client';

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';
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

function getDb() {
  const { db } = getFirebaseServices();
  return db;
}

const docToSupplier = (doc: any): Supplier => ({
    id: doc.id,
    ...doc.data(),
} as Supplier);

export async function getSuppliers(userId: string): Promise<Supplier[]> {
    const db = getDb();
    const q = query(collection(db, SUPPLIERS_COLLECTION), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToSupplier).sort((a,b) => a.name.localeCompare(b.name));
}

export async function addSupplier(data: Omit<Supplier, 'id'>): Promise<Supplier> {
  const db = getDb();
  const docRef = await addDoc(collection(db, SUPPLIERS_COLLECTION), data);
  return { id: docRef.id, ...data };
}

export async function updateSupplier(id: string, data: Partial<Omit<Supplier, 'id' | 'userId'>>): Promise<void> {
    const db = getDb();
    await updateDoc(doc(db, SUPPLIERS_COLLECTION, id), data);
}

export async function deleteSupplier(id: string): Promise<void> {
    const db = getDb();
    await deleteDoc(doc(db, SUPPLIERS_COLLECTION, id));
}

/**
 * Designates an existing contact as a supplier.
 * If a supplier record for this contact already exists, it does nothing.
 * If not, it creates a new supplier record using the contact's details.
 * The supplier ID will match the contact ID.
 */
export async function designateContactAsSupplier(userId: string, contactId: string): Promise<Supplier> {
  const db = getDb();
  const supplierRef = doc(db, SUPPLIERS_COLLECTION, contactId);
  
  const supplierSnap = await getDoc(supplierRef);
  if (supplierSnap.exists()) {
    return docToSupplier(supplierSnap);
  }

  const contact = await getContactById(contactId);
  if (!contact) {
      throw new Error("Contact not found to designate as supplier.");
  }
  
  const supplierData: Omit<Supplier, 'id'> = {
      name: contact.businessName || contact.name,
      contactPerson: contact.name,
      email: contact.email,
      phone: contact.cellPhone || contact.businessPhone || contact.homePhone,
      userId: userId,
  };

  await setDoc(supplierRef, supplierData);
  return { id: contactId, ...supplierData };
}
