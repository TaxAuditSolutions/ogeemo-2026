
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
  writeBatch,
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
  // Note: Logs are kept for historical records.
}

export async function deleteInventoryItems(itemIds: string[]): Promise<void> {
    const db = await getDb();
    if (itemIds.length === 0) return;
    const batch = writeBatch(db);
    itemIds.forEach(id => {
        const docRef = doc(db, ITEMS_COLLECTION, id);
        batch.delete(docRef);
    });
    await batch.commit();
}


export async function getInventoryLogs(userId: string): Promise<InventoryLog[]> {
    const db = await getDb();
    const q = query(collection(db, LOGS_COLLECTION), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToLog).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export async function processSaleTransaction(
  userId: string,
  saleItems: { itemId: string; quantitySold: number }[]
): Promise<void> {
  const db = await getDb();
  const batch = writeBatch(db);

  for (const saleItem of saleItems) {
    const itemRef = doc(db, ITEMS_COLLECTION, saleItem.itemId);
    const itemSnap = await getDoc(itemRef);

    if (!itemSnap.exists()) {
      throw new Error(`Item with ID ${saleItem.itemId} not found.`);
    }

    const currentItem = docToItem(itemSnap);
    if (currentItem.userId !== userId) {
        throw new Error(`Unauthorized to modify item ${currentItem.name}.`);
    }

    const newQuantity = currentItem.stockQuantity - saleItem.quantitySold;
    if (newQuantity < 0) {
      throw new Error(`Insufficient stock for item: ${currentItem.name}.`);
    }

    batch.update(itemRef, { stockQuantity: newQuantity });
    
    // Create a new log entry for the sale
    const logRef = doc(collection(db, LOGS_COLLECTION));
    const logData: Omit<InventoryLog, 'id'> = {
        itemId: currentItem.id,
        itemName: currentItem.name,
        reason: 'Sale',
        quantityChange: -saleItem.quantitySold,
        newQuantity: newQuantity,
        notes: 'Point of Sale transaction',
        timestamp: new Date(),
        userId: userId,
    };
    batch.set(logRef, logData);
  }

  await batch.commit();
}
