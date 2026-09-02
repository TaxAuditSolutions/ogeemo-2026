
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
  Timestamp,
  getDoc,
  writeBatch,
  setDoc,
} from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';
import { t2125IncomeCategories } from '@/data/standard-expense-categories';

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
  userId?: string;
  orgId?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
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
  userId?: string;
  orgId?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ITEMS_COLLECTION = 'inventoryItems';
const LOGS_COLLECTION = 'inventoryLogs';


function getDb() {
  const { db } = getFirebaseServices();
  return db;
}

function getCurrentAuthContext() {
  const { auth } = getFirebaseServices();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('User must be logged in.');
  }

  return currentUser;
}

async function getCurrentOrgId(): Promise<string> {
  const currentUser = getCurrentAuthContext();
  let tokenResult;
  try {
    tokenResult = await currentUser.getIdTokenResult();
  } catch (error) {
    console.warn('Inventory service: unable to read auth claims; falling back to user profile org lookup.', error);
  }
  const claimedOrgId = tokenResult?.claims?.orgId;

  if (typeof claimedOrgId === 'string' && claimedOrgId.trim()) {
    return claimedOrgId;
  }

  const db = getDb();
  const userProfileRef = doc(db, 'users', currentUser.uid);
  const userProfileSnap = await getDoc(userProfileRef);
  const profileOrgId = userProfileSnap.data()?.orgId;

  if (typeof profileOrgId === 'string' && profileOrgId.trim()) {
    return profileOrgId;
  }

  throw new Error('Authenticated user is missing an orgId claim and profile orgId.');
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
  const db = getDb();
  const currentUser = getCurrentAuthContext();
  const orgId = await getCurrentOrgId();
  const now = new Date();

  await addDoc(collection(db, LOGS_COLLECTION), {
    ...logData,
    orgId,
    createdBy: currentUser.uid,
    updatedBy: currentUser.uid,
    createdAt: now,
    updatedAt: now,
  });
}

export async function getInventoryItems(_userId?: string): Promise<Item[]> {
  const db = getDb();
  const orgId = await getCurrentOrgId();
  const q = query(collection(db, ITEMS_COLLECTION), where("orgId", "==", orgId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToItem).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getInventoryItemById(itemId: string): Promise<Item | null> {
  const db = getDb();
  const orgId = await getCurrentOrgId();
  const docRef = doc(db, ITEMS_COLLECTION, itemId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const item = docToItem(docSnap);
    return item.orgId === orgId ? item : null;
  }
  return null;
}

export async function addInventoryItem(data: Omit<Item, 'id'>): Promise<Item> {
  const db = getDb();
  const currentUser = getCurrentAuthContext();
  const orgId = await getCurrentOrgId();
  const now = new Date();
  const dataToSave = {
    ...data,
    orgId,
    createdBy: currentUser.uid,
    updatedBy: currentUser.uid,
    createdAt: now,
    updatedAt: now,
  };
  const docRef = await addDoc(collection(db, ITEMS_COLLECTION), dataToSave);

  if (dataToSave.stockQuantity > 0) {
    await addInventoryLog({
      itemId: docRef.id,
      itemName: dataToSave.name,
      reason: 'Initial Stock',
      quantityChange: dataToSave.stockQuantity,
      newQuantity: dataToSave.stockQuantity,
      notes: 'Item created',
      timestamp: new Date(),
      userId: dataToSave.userId,
    });
  }

  return { id: docRef.id, ...dataToSave };
}

export async function updateInventoryItem(id: string, data: Partial<Omit<Item, 'id' | 'userId'>>, logInfo: { reason: InventoryLogReason, notes?: string }): Promise<void> {
  const db = getDb();
  const currentUser = getCurrentAuthContext();
  const orgId = await getCurrentOrgId();
  const docRef = doc(db, ITEMS_COLLECTION, id);
  const currentDoc = await getDoc(docRef);

  if (!currentDoc.exists()) {
    throw new Error('Item not found.');
  }

  const currentData = currentDoc.data() as Item;
  if (currentData.orgId !== orgId) {
    throw new Error('Item not found in your organization.');
  }

  if (data.stockQuantity !== undefined) {
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
  await updateDoc(docRef, {
    ...data,
    updatedBy: currentUser.uid,
    updatedAt: new Date(),
  });
}

export async function deleteInventoryItem(id: string): Promise<void> {
  const db = getDb();
  const orgId = await getCurrentOrgId();
  const docRef = doc(db, ITEMS_COLLECTION, id);
  const itemSnap = await getDoc(docRef);

  if (!itemSnap.exists() || itemSnap.data()?.orgId !== orgId) {
    throw new Error('Item not found in your organization.');
  }

  await deleteDoc(docRef);
  // Note: Logs are kept for historical records for now.
}

export async function deleteInventoryItems(itemIds: string[]): Promise<void> {
  const db = getDb();
  if (itemIds.length === 0) return;
  const orgId = await getCurrentOrgId();
  const batch = writeBatch(db);

  for (const id of itemIds) {
    const docRef = doc(db, ITEMS_COLLECTION, id);
    const itemSnap = await getDoc(docRef);

    if (!itemSnap.exists() || itemSnap.data()?.orgId !== orgId) {
      continue;
    }

    batch.delete(docRef);
  }

  await batch.commit();
}


export async function getInventoryLogs(_userId?: string): Promise<InventoryLog[]> {
  const db = getDb();
  const orgId = await getCurrentOrgId();
  const q = query(collection(db, LOGS_COLLECTION), where("orgId", "==", orgId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToLog).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export async function processSaleTransaction(
  _userId: string,
  saleItems: { itemId: string; quantitySold: number }[],
  saleDetails: { subtotal: number; taxTotal: number; grandTotal: number }
): Promise<void> {
  const db = getDb();
  const currentUser = getCurrentAuthContext();
  const orgId = await getCurrentOrgId();
  const batch = writeBatch(db);

  for (const saleItem of saleItems) {
    const itemRef = doc(db, ITEMS_COLLECTION, saleItem.itemId);
    const itemSnap = await getDoc(itemRef);

    if (!itemSnap.exists()) {
      throw new Error(`Item with ID ${saleItem.itemId} not found.`);
    }

    const currentItem = docToItem(itemSnap);
    if (currentItem.orgId !== orgId) {
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
      userId: currentUser.uid,
      orgId,
      createdBy: currentUser.uid,
      updatedBy: currentUser.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    batch.set(logRef, logData);
  }

  // Create the corresponding income transaction
  const incomeTxRef = doc(collection(db, 'incomeTransactions'));
  const primaryIncomeLine = t2125IncomeCategories.find(c => c.key === 'sales')?.line;

  batch.set(incomeTxRef, {
    userId: currentUser.uid,
    orgId,
    date: new Date().toISOString().split('T')[0],
    company: 'Point of Sale Customer',
    description: `POS Sale - ${saleItems.length} item(s)`,
    totalAmount: saleDetails.grandTotal,
    preTaxAmount: saleDetails.subtotal,
    taxAmount: saleDetails.taxTotal,
    taxRate: saleDetails.subtotal > 0 ? (saleDetails.taxTotal / saleDetails.subtotal) * 100 : 0,
    incomeCategory: primaryIncomeLine || 'C-1', // Default to 'Sales' category or a custom fallback
    depositedTo: 'Cash Account', // Assuming cash or a default account
    type: 'business',
    createdBy: currentUser.uid,
    updatedBy: currentUser.uid,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await batch.commit();
}
