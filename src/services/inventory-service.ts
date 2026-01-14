
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
  Timestamp,
  getDoc,
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

export interface Item {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  type: 'Product for Sale' | 'Internal Supply' | 'Raw Material';
  stockQuantity: number;
  cost?: number | null;
  price?: number | null;
  supplierId?: string | null;
  userId: string;
  acquisitionDate?: Date | null;
  dispositionDate?: Date | null;
  dispositionReason?: string;
  unitOfMeasure?: string;
}

export type InventoryLogReason = 'Initial Stock' | 'Purchase' | 'Sale' | 'Adjustment' | 'Shrinkage' | 'Consumed' | 'Destroyed';

export interface InventoryLog {
    id: string;
    itemId: string;
    itemName: string;
    reason: InventoryLogReason;
    quantityChange: number;
    newQuantity: number;
    notes?: string;
    timestamp: Date;
    userId: string;
}

const ITEMS_COLLECTION = 'inventoryItems';
const LOGS_COLLECTION = 'inventoryLogs';


async function getDb() {
    const { db } = await initializeFirebase();
    return db;
}

const docToItem = (doc: any): Item => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      acquisitionDate: (data.acquisitionDate as Timestamp)?.toDate() || null,
      dispositionDate: (data.dispositionDate as Timestamp)?.toDate() || null,
    } as Item;
};

const docToLog = (doc: any): InventoryLog => ({
    id: doc.id,
    ...doc.data(),
    timestamp: (doc.data().timestamp as Timestamp).toDate(),
} as InventoryLog);


async function addInventoryLog(logData: Omit<InventoryLog, 'id'>): Promise<void> {
    const db = await getDb();
    await addDoc(collection(db, LOGS_COLLECTION), logData);
}

export async function getInventoryItems(userId: string): Promise<Item[]> {
  const db = await getDb();
  const q = query(collection(db, ITEMS_COLLECTION), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToItem).sort((a,b) => a.name.localeCompare(b.name));
}

export async function getInventoryItemById(itemId: string): Promise<Item | null> {
    const db = await getDb();
    const docRef = doc(db, ITEMS_COLLECTION, itemId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docToItem(docSnap);
    }
    return null;
}

export async function addInventoryItem(data: Omit<Item, 'id'>): Promise<Item> {
  const db = await getDb();
  const docRef = await addDoc(collection(db, ITEMS_COLLECTION), data);
  
  if (data.stockQuantity > 0) {
    await addInventoryLog({
        itemId: docRef.id,
        itemName: data.name,
        reason: 'Initial Stock',
        quantityChange: data.stockQuantity,
        newQuantity: data.stockQuantity,
        notes: 'Item created',
        timestamp: new Date(),
        userId: data.userId,
    });
  }

  return { id: docRef.id, ...data };
}

export async function updateInventoryItem(id: string, data: Partial<Omit<Item, 'id' | 'userId'>>, logInfo: { reason: InventoryLogReason, notes?: string }): Promise<void> {
  const db = await getDb();
  const docRef = doc(db, ITEMS_COLLECTION, id);

  if (data.stockQuantity !== undefined) {
      const currentDoc = await getDoc(docRef);
      if (currentDoc.exists()) {
          const currentData = currentDoc.data() as Item;
          const quantityChange = data.stockQuantity - currentData.stockQuantity;
          if (quantityChange !== 0) {
            await addInventoryLog({
                itemId: id,
                itemName: data.name || currentData.name,
                reason: logInfo.reason,
                quantityChange: quantityChange,
                newQuantity: data.stockQuantity,
                notes: logInfo.notes,
                timestamp: new Date(),
                userId: currentData.userId,
            });
          }
      }
  }
  await updateDoc(docRef, data);
}

export async function deleteInventoryItem(id: string): Promise<void> {
  const db = await getDb();
  const docRef = doc(db, ITEMS_COLLECTION, id);
  await deleteDoc(docRef);
  // Note: Consider if logs should also be deleted or kept for historical records.
  // For now, logs are kept.
}

export async function getInventoryLogs(userId: string): Promise<InventoryLog[]> {
    const db = await getDb();
    const q = query(collection(db, LOGS_COLLECTION), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToLog).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}
