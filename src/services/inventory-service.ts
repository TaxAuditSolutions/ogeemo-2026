
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
  runTransaction,
} from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';
import { t2125IncomeCategories } from '@/data/standard-expense-categories';
import { planSale, type StockItem } from '@/lib/inventory-sale';
import { impliedTaxRate } from '@/lib/payment-tax';
import { todayDateKey } from '@/lib/ledger-date';

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

/** Firestore rejects `undefined` field values, so drop them (an item with no SKU used to fail to save). */
function withoutUndefined<T extends Record<string, unknown>>(data: T): T {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as T;
}

export async function addInventoryItem(data: Omit<Item, 'id'>): Promise<Item> {
  const db = getDb();
  const currentUser = getCurrentAuthContext();
  const orgId = await getCurrentOrgId();
  const now = new Date();
  const dataToSave = withoutUndefined({
    ...data,
    orgId,
    createdBy: currentUser.uid,
    updatedBy: currentUser.uid,
    createdAt: now,
    updatedAt: now,
  });

  // The item and its opening stock entry are saved together, so stock never exists without its history.
  const batch = writeBatch(db);
  const itemRef = doc(collection(db, ITEMS_COLLECTION));
  batch.set(itemRef, dataToSave);
  if (dataToSave.stockQuantity > 0) {
    batch.set(doc(collection(db, LOGS_COLLECTION)), {
      itemId: itemRef.id,
      itemName: dataToSave.name,
      reason: 'Initial Stock',
      quantityChange: dataToSave.stockQuantity,
      newQuantity: dataToSave.stockQuantity,
      notes: 'Item created',
      timestamp: now,
      userId: dataToSave.userId ?? currentUser.uid,
      orgId,
      createdBy: currentUser.uid,
      updatedBy: currentUser.uid,
      createdAt: now,
      updatedAt: now,
    });
  }
  await batch.commit();

  return { id: itemRef.id, ...dataToSave } as Item;
}

export async function updateInventoryItem(id: string, data: Partial<Omit<Item, 'id' | 'userId'>>, logInfo: { reason: InventoryLogReason, notes?: string }): Promise<void> {
  const db = getDb();
  const currentUser = getCurrentAuthContext();
  const orgId = await getCurrentOrgId();
  const docRef = doc(db, ITEMS_COLLECTION, id);

  // Read, compare and write in one transaction: a sale made at the same moment on another till can no
  // longer be overwritten by an older stock figure, and the history entry always matches the change.
  await runTransaction(db, async (transaction) => {
    const currentDoc = await transaction.get(docRef);
    if (!currentDoc.exists()) throw new Error('Item not found.');
    const currentData = currentDoc.data() as Item;
    if (currentData.orgId !== orgId) throw new Error('Item not found in your organization.');

    const now = new Date();
    if (data.stockQuantity !== undefined) {
      const quantityChange = Math.round((data.stockQuantity - (Number(currentData.stockQuantity) || 0)) * 1000) / 1000;
      if (quantityChange !== 0) {
        transaction.set(doc(collection(db, LOGS_COLLECTION)), {
          itemId: id,
          itemName: data.name || currentData.name,
          reason: logInfo.reason,
          quantityChange,
          newQuantity: data.stockQuantity,
          ...(logInfo.notes ? { notes: logInfo.notes } : {}),
          timestamp: now,
          userId: currentData.userId ?? currentUser.uid,
          orgId,
          createdBy: currentUser.uid,
          updatedBy: currentUser.uid,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    transaction.update(docRef, withoutUndefined({ ...data, updatedBy: currentUser.uid, updatedAt: now }));
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

export interface SaleResult {
  subtotal: number;
  tax: number;
  total: number;
}

/**
 * Completes a Point of Sale sale. In one transaction it re-reads each item, checks stock and price
 * against what is in the database now (not what the screen showed), takes the stock out, writes one
 * history entry per item, and records the income. Either all of it happens or none of it does, and
 * two tills selling the last unit cannot both succeed.
 */
export async function processSaleTransaction(
  _userId: string,
  cart: { itemId: string; quantitySold: number; taxRate?: number | null }[]
): Promise<SaleResult> {
  const db = getDb();
  const currentUser = getCurrentAuthContext();
  const orgId = await getCurrentOrgId();
  const primaryIncomeLine = t2125IncomeCategories.find(c => c.key === 'sales')?.line;
  const itemIds = Array.from(new Set(cart.map(line => line.itemId)));

  return runTransaction(db, async (transaction) => {
    const current = new Map<string, StockItem>();
    for (const itemId of itemIds) {
      const snap = await transaction.get(doc(db, ITEMS_COLLECTION, itemId));
      if (!snap.exists() || snap.data()?.orgId !== orgId) {
        throw new Error('An item in this sale no longer exists. Remove it and try again.');
      }
      current.set(itemId, docToItem(snap) as StockItem);
    }

    const result = planSale(current, cart.map(line => ({ itemId: line.itemId, quantity: line.quantitySold, taxRate: line.taxRate })));
    if (!result.plan) throw new Error(result.error);
    const plan = result.plan;

    const now = new Date();
    for (const move of plan.movements) {
      transaction.update(doc(db, ITEMS_COLLECTION, move.itemId), { stockQuantity: move.newQuantity, updatedBy: currentUser.uid, updatedAt: now });
      transaction.set(doc(collection(db, LOGS_COLLECTION)), {
        itemId: move.itemId,
        itemName: move.name,
        reason: 'Sale',
        quantityChange: -move.quantity,
        newQuantity: move.newQuantity,
        notes: 'Point of Sale transaction',
        timestamp: now,
        userId: currentUser.uid,
        orgId,
        createdBy: currentUser.uid,
        updatedBy: currentUser.uid,
        createdAt: now,
        updatedAt: now,
      });
    }

    transaction.set(doc(collection(db, 'incomeTransactions')), {
      userId: currentUser.uid,
      orgId,
      // The business's own calendar day. toISOString() is UTC, which after about 7 pm in Canada is already tomorrow.
      date: todayDateKey(now),
      company: 'Point of Sale Customer',
      description: plan.description,
      totalAmount: plan.total,
      preTaxAmount: plan.subtotal,
      taxAmount: plan.tax,
      taxRate: impliedTaxRate(plan.subtotal, plan.tax),
      incomeCategory: primaryIncomeLine || 'Part 3A',
      depositedTo: 'Cash Account',
      type: 'business',
      createdBy: currentUser.uid,
      updatedBy: currentUser.uid,
      createdAt: now,
      updatedAt: now,
    });

    return { subtotal: plan.subtotal, tax: plan.tax, total: plan.total };
  });
}
