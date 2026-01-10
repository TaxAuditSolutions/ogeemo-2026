
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
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

export interface Item {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  type: 'Product' | 'Supply' | 'Material';
  stockQuantity: number;
  cost?: number;
  price?: number;
  userId: string;
}

const ITEMS_COLLECTION = 'inventoryItems';

async function getDb() {
    const { db } = await initializeFirebase();
    return db;
}

const docToItem = (doc: any): Item => ({
  id: doc.id,
  ...doc.data(),
} as Item);

export async function getInventoryItems(userId: string): Promise<Item[]> {
  const db = await getDb();
  const q = query(collection(db, ITEMS_COLLECTION), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToItem).sort((a,b) => a.name.localeCompare(b.name));
}

export async function addInventoryItem(data: Omit<Item, 'id'>): Promise<Item> {
  const db = await getDb();
  const docRef = await addDoc(collection(db, ITEMS_COLLECTION), data);
  return { id: docRef.id, ...data };
}

export async function updateInventoryItem(id: string, data: Partial<Omit<Item, 'id' | 'userId'>>): Promise<void> {
  const db = await getDb();
  const docRef = doc(db, ITEMS_COLLECTION, id);
  await updateDoc(docRef, data);
}

export async function deleteInventoryItem(id: string): Promise<void> {
  const db = await getDb();
  const docRef = doc(db, ITEMS_COLLECTION, id);
  await deleteDoc(docRef);
}
