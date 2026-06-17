'use client';

import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  Timestamp,
  setDoc,
} from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';
import { format } from 'date-fns';
import { t2125ExpenseCategories, t2125IncomeCategories } from '@/data/standard-expense-categories';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';


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

function toClientDate(value: any): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  return undefined;
}

function toFirestoreDateValue(value: any): Date | null {
  if (value === null) return null;
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

async function getCurrentOrgId(): Promise<string> {
  const currentUser = getCurrentAuthContext();
  const tokenResult = await currentUser.getIdTokenResult();
  const claimedOrgId = tokenResult.claims.orgId;
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

// --- Base Interface ---
export interface BaseTransaction {
  id: string;
  date: string;
  company: string;
  description: string;
  totalAmount: number;
  quantity?: number;
  unitPrice?: number;
  preTaxAmount?: number;
  taxAmount?: number;
  taxRate?: number;
  taxType?: string; // Descriptive label like HST, GST
  explanation?: string;
  documentNumber?: string;
  documentUrl?: string;
  type: 'business' | 'personal';
  paymentMethod?: string;
  userId: string;
  isReconciled?: boolean;
  bankReferenceId?: string;
}

export interface IncomeTransaction extends BaseTransaction {
  incomeCategory: string;
  depositedTo: string; // This will store the InternalAccount ID or name
}

export interface ExpenseTransaction extends BaseTransaction {
  category: string;
  paidFrom?: string; // This will store the InternalAccount ID or name
}

export interface PayableBill {
  id: string;
  vendor: string;
  invoiceNumber?: string;
  dueDate: string;
  totalAmount: number;
  quantity?: number;
  unitPrice?: number;
  preTaxAmount?: number;
  taxAmount?: number;
  taxRate?: number;
  taxType?: string;
  category: string;
  description?: string;
  documentUrl?: string;
  userId: string;
}

export interface PettyCashTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'in' | 'out';
  contact: string;
  category: string;
  isPosted: boolean;
  userId: string;
}

export interface TaxType {
  id: string;
  orgId?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  name: string;
  rate: number;
  userId: string;
}

export interface InternalAccount {
  id: string;
  name: string;
  type: 'Bank' | 'Credit Card' | 'Cash' | 'Other';
  userId: string;
  // Registry Extensions
  bankName?: string;
  institutionNumber?: string;
  transitNumber?: string;
  accountNumber?: string;
  businessType?: "Business" | "Personal";
}

// --- Invoice Interfaces & Functions ---
export interface InvoiceLineItem {
  id?: string;
  orgId?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  invoiceId: string;
  description: string;
  internalNotes?: string;
  categoryNumber?: string;
  quantity: number;
  price: number;
  totalAmount?: number;
  preTaxAmount?: number;
  taxAmount?: number;
  taxType?: string;
  taxRate?: number;
  itemType?: 'service' | 'product';
  userId: string;
}

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'converted';

export interface QuoteLineItem {
  id?: string;
  orgId?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  quoteId: string;
  description: string;
  internalNotes?: string;
  categoryNumber?: string;
  quantity: number;
  price: number;
  totalAmount?: number;
  preTaxAmount?: number;
  taxAmount?: number;
  taxType?: string;
  taxRate?: number;
  itemType?: 'service' | 'product';
  userId: string;
}

export interface Quote {
  id: string;
  orgId?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  quoteNumber: string;
  businessNumber?: string;
  companyName: string;
  contactId: string;
  supplierId?: string | null;
  totalAmount: number;
  quoteDate: Date;
  expirationDate: Date;
  status: QuoteStatus;
  notes: string;
  taxType: string;
  userId: string;
}

export interface Invoice {
  id: string;
  orgId?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  invoiceNumber: string;
  businessNumber?: string;
  companyName: string;
  contactId: string;
  supplierId?: string | null;
  originalAmount: number;
  amountPaid: number;
  dueDate: Date;
  invoiceDate: Date;
  status: 'outstanding' | 'paid' | 'partially_paid' | 'overdue';
  notes: string;
  taxType: string;
  userId: string;
}

export interface ServiceItem {
  id: string;
  orgId?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  description: string;
  price: number;
  taxType?: string;
  taxRate?: number;
  itemType?: 'service' | 'product';
  userId: string;
}

const INVOICES_COLLECTION = 'invoices';
const LINE_ITEMS_COLLECTION = 'invoiceLineItems';
const QUOTES_COLLECTION = 'quotes';
const QUOTE_LINE_ITEMS_COLLECTION = 'quoteLineItems';
const INCOME_COLLECTION = 'incomeTransactions';
const EXPENSE_COLLECTION = 'expenseTransactions';
const PAYABLES_COLLECTION = 'payableBills';
const ASSETS_COLLECTION = 'assets';
const EQUITY_COLLECTION = 'equityTransactions';
const LOANS_COLLECTION = 'loans';
const COMPANIES_COLLECTION = 'companies';
const INCOME_CATEGORIES_COLLECTION = 'incomeCategories';
const EXPENSE_CATEGORIES_COLLECTION = 'expenseCategories';
const SERVICE_ITEMS_COLLECTION = 'serviceItems';
const TAX_TYPES_COLLECTION = 'taxTypes';
const REMITTANCES_COLLECTION = 'payrollRemittances';
const INTERNAL_ACCOUNT_COLLECTION = 'internalAccounts';
const PETTY_CASH_COLLECTION = 'pettyCashTransactions';

const docToInvoice = (doc: any): Invoice => {
  const data = doc.data();
  if (!data) throw new Error("Document data is missing.");
  return {
    id: doc.id,
    orgId: data.orgId,
    createdBy: data.createdBy,
    updatedBy: data.updatedBy,
    invoiceNumber: data.invoiceNumber,
    businessNumber: data.businessNumber,
    companyName: data.companyName,
    contactId: data.contactId,
    supplierId: data.supplierId || null,
    originalAmount: data.originalAmount,
    amountPaid: data.amountPaid || 0,
    dueDate: toClientDate(data.dueDate) || new Date(),
    invoiceDate: toClientDate(data.invoiceDate) || new Date(),
    status: data.status,
    notes: data.notes,
    taxType: data.taxType,
    userId: data.userId,
    createdAt: toClientDate(data.createdAt),
    updatedAt: toClientDate(data.updatedAt),
  } as Invoice;
};

const docToLineItem = (doc: any): InvoiceLineItem => {
  const data = doc.data();
  return {
    id: doc.id,
    orgId: data.orgId,
    createdBy: data.createdBy,
    updatedBy: data.updatedBy,
    createdAt: toClientDate(data.createdAt),
    updatedAt: toClientDate(data.updatedAt),
    invoiceId: data.invoiceId,
    description: data.description,
    internalNotes: data.internalNotes || '',
    categoryNumber: data.categoryNumber || '',
    quantity: data.quantity,
    price: data.price,
    totalAmount: data.totalAmount,
    preTaxAmount: data.preTaxAmount,
    taxAmount: data.taxAmount,
    taxType: data.taxType || '',
    taxRate: data.taxRate || 0,
    itemType: data.itemType,
    userId: data.userId,
  } as InvoiceLineItem;
};

const docToQuoteLineItem = (doc: any): QuoteLineItem => {
  const data = doc.data();
  return {
    id: doc.id,
    orgId: data.orgId,
    createdBy: data.createdBy,
    updatedBy: data.updatedBy,
    createdAt: toClientDate(data.createdAt),
    updatedAt: toClientDate(data.updatedAt),
    quoteId: data.quoteId,
    description: data.description,
    internalNotes: data.internalNotes || '',
    categoryNumber: data.categoryNumber || '',
    quantity: data.quantity,
    price: data.price,
    totalAmount: data.totalAmount,
    preTaxAmount: data.preTaxAmount,
    taxAmount: data.taxAmount,
    taxType: data.taxType || '',
    taxRate: data.taxRate || 0,
    itemType: data.itemType,
    userId: data.userId,
  } as QuoteLineItem;
};

const docToQuote = (doc: any): Quote => {
  const data = doc.data();
  if (!data) throw new Error("Document data is missing.");
  return {
    id: doc.id,
    orgId: data.orgId,
    createdBy: data.createdBy,
    updatedBy: data.updatedBy,
    quoteNumber: data.quoteNumber,
    businessNumber: data.businessNumber,
    companyName: data.companyName,
    contactId: data.contactId,
    supplierId: data.supplierId || null,
    totalAmount: data.totalAmount,
    quoteDate: toClientDate(data.quoteDate) || new Date(),
    expirationDate: toClientDate(data.expirationDate) || new Date(),
    status: data.status,
    notes: data.notes,
    taxType: data.taxType,
    userId: data.userId,
    createdAt: toClientDate(data.createdAt),
    updatedAt: toClientDate(data.updatedAt),
  } as Quote;
};

const docToServiceItem = (doc: any): ServiceItem => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: toClientDate(data.createdAt),
    updatedAt: toClientDate(data.updatedAt),
  } as ServiceItem;
};

export async function getInvoices(_userId: string): Promise<Invoice[]> {
  const db = getDb();
  const orgId = await getCurrentOrgId();
  const q = query(collection(db, INVOICES_COLLECTION), where('orgId', '==', orgId));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToInvoice).sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: INVOICES_COLLECTION,
        operation: 'list',
      }));
    }
    throw error;
  }
}

export async function getInvoiceById(invoiceId: string): Promise<Invoice | null> {
  const db = getDb();
  const orgId = await getCurrentOrgId();
  const docRef = doc(db, INVOICES_COLLECTION, invoiceId);
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const invoice = docToInvoice(docSnap);
      return invoice.orgId === orgId ? invoice : null;
    }
    return null;
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'get',
      }));
    }
    throw error;
  }
}

export async function getLineItemsForInvoice(_userId: string, invoiceId: string): Promise<InvoiceLineItem[]> {
  const db = getDb();
  const orgId = await getCurrentOrgId();
  const q = query(
    collection(db, LINE_ITEMS_COLLECTION),
    where('orgId', '==', orgId),
    where("invoiceId", "==", invoiceId)
  );
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToLineItem);
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: LINE_ITEMS_COLLECTION,
        operation: 'list',
      }));
    }
    throw error;
  }
}

export async function getQuoteLineItemsForQuote(_userId: string, quoteId: string): Promise<QuoteLineItem[]> {
  const db = getDb();
  const orgId = await getCurrentOrgId();
  const q = query(
    collection(db, QUOTE_LINE_ITEMS_COLLECTION),
    where('orgId', '==', orgId),
    where("quoteId", "==", quoteId)
  );
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToQuoteLineItem);
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: QUOTE_LINE_ITEMS_COLLECTION,
        operation: 'list',
      }));
    }
    throw error;
  }
}

export async function getQuotes(_userId: string): Promise<Quote[]> {
  const db = getDb();
  const orgId = await getCurrentOrgId();
  const q = query(collection(db, QUOTES_COLLECTION), where('orgId', '==', orgId));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToQuote).sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: QUOTES_COLLECTION,
        operation: 'list',
      }));
    }
    throw error;
  }
}

export async function getQuoteById(quoteId: string): Promise<Quote | null> {
  const db = getDb();
  const orgId = await getCurrentOrgId();
  const docRef = doc(db, QUOTES_COLLECTION, quoteId);
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const quote = docToQuote(docSnap);
      return quote.orgId === orgId ? quote : null;
    }
    return null;
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'get',
      }));
    }
    throw error;
  }
}

export async function addQuoteWithLineItems(
  quoteData: Omit<Quote, 'id' | 'createdAt'>,
  lineItems: Omit<QuoteLineItem, 'quoteId' | 'id' | 'userId'>[]
): Promise<Quote> {
  const db = getDb();
  const currentUser = getCurrentAuthContext();
  const orgId = await getCurrentOrgId();
  const batch = writeBatch(db);

  const quoteRef = doc(collection(db, QUOTES_COLLECTION));
  const quotePayload = {
    ...quoteData,
    orgId,
    createdBy: currentUser.uid,
    updatedBy: currentUser.uid,
    createdAt: new Date(),
    updatedAt: new Date(),
    quoteDate: toFirestoreDateValue(quoteData.quoteDate),
    expirationDate: toFirestoreDateValue(quoteData.expirationDate),
  };
  batch.set(quoteRef, quotePayload);

  lineItems.forEach(item => {
    const itemRef = doc(collection(db, QUOTE_LINE_ITEMS_COLLECTION));
    batch.set(itemRef, {
      ...item,
      quoteId: quoteRef.id,
      userId: quoteData.userId,
      orgId,
      createdBy: currentUser.uid,
      updatedBy: currentUser.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  await batch.commit().catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'batch',
        operation: 'write',
        requestResourceData: { quoteData, lineItems },
      }));
    }
    throw error;
  });

  return docToQuote({ id: quoteRef.id, data: () => quotePayload });
}

export async function updateQuoteWithLineItems(
  quoteId: string,
  quoteData: Partial<Omit<Quote, 'id' | 'userId'>>,
  lineItems: Omit<QuoteLineItem, 'id' | 'quoteId' | 'userId'>[],
  userId: string
): Promise<void> {
  const db = getDb();
  const currentUser = getCurrentAuthContext();
  const orgId = await getCurrentOrgId();

  const quoteRef = doc(db, QUOTES_COLLECTION, quoteId);
  const quoteSnap = await getDoc(quoteRef);
  if (!quoteSnap.exists() || quoteSnap.data().orgId !== orgId) return;

  const existingItemsQuery = query(
    collection(db, QUOTE_LINE_ITEMS_COLLECTION),
    where('orgId', '==', orgId),
    where('quoteId', '==', quoteId)
  );
  const existingItemsSnapshot = await getDocs(existingItemsQuery);

  const batch = writeBatch(db);

  batch.update(quoteRef, {
    ...quoteData,
    orgId,
    updatedBy: currentUser.uid,
    updatedAt: new Date(),
    quoteDate: 'quoteDate' in quoteData ? toFirestoreDateValue((quoteData as any).quoteDate) : quoteSnap.data().quoteDate,
    expirationDate: 'expirationDate' in quoteData ? toFirestoreDateValue((quoteData as any).expirationDate) : quoteSnap.data().expirationDate,
  });

  existingItemsSnapshot.forEach(doc => {
    batch.delete(doc.ref);
  });

  lineItems.forEach(item => {
    const itemRef = doc(collection(db, QUOTE_LINE_ITEMS_COLLECTION));
    batch.set(itemRef, {
      ...item,
      quoteId,
      userId,
      orgId,
      createdBy: currentUser.uid,
      updatedBy: currentUser.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  await batch.commit().catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'batch',
        operation: 'write',
        requestResourceData: { quoteData, lineItems },
      }));
    }
    throw error;
  });
}

export async function updateQuoteStatus(quoteId: string, status: QuoteStatus, userId: string): Promise<void> {
  const db = getDb();
  const orgId = await getCurrentOrgId();
  const currentUser = getCurrentAuthContext();
  const quoteRef = doc(db, QUOTES_COLLECTION, quoteId);
  const quoteSnap = await getDoc(quoteRef);
  if (!quoteSnap.exists() || quoteSnap.data().orgId !== orgId) return;

  await updateDoc(quoteRef, {
    status,
    updatedBy: currentUser.uid,
    updatedAt: new Date(),
  });
}

export async function deleteQuote(userId: string, quoteId: string): Promise<void> {
  const db = getDb();
  const orgId = await getCurrentOrgId();

  const quoteRef = doc(db, QUOTES_COLLECTION, quoteId);
  const quoteSnap = await getDoc(quoteRef);
  if (!quoteSnap.exists() || quoteSnap.data().orgId !== orgId) return;

  const lineItemsQuery = query(
    collection(db, QUOTE_LINE_ITEMS_COLLECTION),
    where('orgId', '==', orgId),
    where('quoteId', '==', quoteId)
  );
  const lineItemsSnapshot = await getDocs(lineItemsQuery);

  const batch = writeBatch(db);
  batch.delete(quoteRef);
  lineItemsSnapshot.forEach(doc => batch.delete(doc.ref));

  await batch.commit().catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'batch',
        operation: 'delete',
      }));
    }
    throw error;
  });
}

export async function convertQuoteToInvoice(quoteId: string, userId: string): Promise<Invoice> {
  const db = getDb();
  const orgId = await getCurrentOrgId();
  const currentUser = getCurrentAuthContext();

  const quote = await getQuoteById(quoteId);
  if (!quote) throw new Error('Quote not found.');

  const lineItems = await getQuoteLineItemsForQuote(userId, quoteId);
  const quoteRef = doc(db, QUOTES_COLLECTION, quoteId);

  const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
  const now = new Date();
  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + 14);

  const invoiceData = {
    invoiceNumber,
    businessNumber: quote.businessNumber,
    companyName: quote.companyName,
    contactId: quote.contactId,
    supplierId: quote.supplierId,
    originalAmount: quote.totalAmount,
    amountPaid: 0,
    dueDate,
    invoiceDate: now,
    status: 'outstanding' as const,
    notes: quote.notes || `Converted from quote ${quote.quoteNumber}`,
    taxType: quote.taxType,
    userId,
  };

  const invoiceLineItems = lineItems.map(item => ({
    description: item.description,
    internalNotes: item.internalNotes,
    categoryNumber: item.categoryNumber,
    quantity: item.quantity,
    price: item.price,
    totalAmount: item.totalAmount,
    preTaxAmount: item.preTaxAmount,
    taxAmount: item.taxAmount,
    taxType: item.taxType,
    taxRate: item.taxRate,
    itemType: item.itemType,
  }));

  const invoice = await addInvoiceWithLineItems(invoiceData, invoiceLineItems);
  await updateDoc(quoteRef, {
    status: 'converted',
    updatedBy: currentUser.uid,
    updatedAt: new Date(),
  });
  return invoice;
}


export async function addInvoiceWithLineItems(
  invoiceData: Omit<Invoice, 'id' | 'createdAt'>,
  lineItems: Omit<InvoiceLineItem, 'invoiceId' | 'id' | 'userId'>[]
): Promise<Invoice> {
  const db = getDb();
  const currentUser = getCurrentAuthContext();
  const orgId = await getCurrentOrgId();
  const batch = writeBatch(db);

  const invoiceRef = doc(collection(db, INVOICES_COLLECTION));
  const invoicePayload = {
    ...invoiceData,
    orgId,
    createdBy: currentUser.uid,
    updatedBy: currentUser.uid,
    createdAt: new Date(),
    updatedAt: new Date(),
    invoiceDate: toFirestoreDateValue(invoiceData.invoiceDate),
    dueDate: toFirestoreDateValue(invoiceData.dueDate),
  };
  batch.set(invoiceRef, invoicePayload);

  lineItems.forEach(item => {
    const itemRef = doc(collection(db, LINE_ITEMS_COLLECTION));
    batch.set(itemRef, {
      ...item,
      invoiceId: invoiceRef.id,
      userId: invoiceData.userId,
      orgId,
      createdBy: currentUser.uid,
      updatedBy: currentUser.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  await batch.commit().catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'batch',
        operation: 'write',
        requestResourceData: { invoiceData, lineItems },
      }));
    }
    throw error;
  });

  return docToInvoice({ id: invoiceRef.id, data: () => invoicePayload });
}

export async function updateInvoiceWithLineItems(
  invoiceId: string,
  invoiceData: Partial<Omit<Invoice, 'id' | 'userId'>>,
  lineItems: Omit<InvoiceLineItem, 'id' | 'invoiceId' | 'userId'>[],
  userId: string
): Promise<void> {
  const db = getDb();
  const currentUser = getCurrentAuthContext();
  const orgId = await getCurrentOrgId();

  const invoiceRef = doc(db, INVOICES_COLLECTION, invoiceId);
  const invoiceSnap = await getDoc(invoiceRef);
  if (!invoiceSnap.exists() || invoiceSnap.data().orgId !== orgId) return;

  // 1. Clear existing items
  const existingItemsQuery = query(
    collection(db, LINE_ITEMS_COLLECTION),
    where('orgId', '==', orgId),
    where("invoiceId", "==", invoiceId)
  );
  const existingItemsSnapshot = await getDocs(existingItemsQuery);

  const batch = writeBatch(db);

  // 2. Update invoice metadata
  batch.update(invoiceRef, {
    ...invoiceData,
    orgId,
    updatedBy: currentUser.uid,
    updatedAt: new Date(),
    invoiceDate: 'invoiceDate' in invoiceData ? toFirestoreDateValue((invoiceData as any).invoiceDate) : invoiceSnap.data().invoiceDate,
    dueDate: 'dueDate' in invoiceData ? toFirestoreDateValue((invoiceData as any).dueDate) : invoiceSnap.data().dueDate,
  });

  // 3. Delete old items
  existingItemsSnapshot.forEach(doc => {
    batch.delete(doc.ref);
  });

  // 4. Set new items
  lineItems.forEach(item => {
    const itemRef = doc(collection(db, LINE_ITEMS_COLLECTION));
    batch.set(itemRef, {
      ...item,
      invoiceId,
      userId,
      orgId,
      createdBy: currentUser.uid,
      updatedBy: currentUser.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  await batch.commit().catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'batch',
        operation: 'write',
        requestResourceData: { invoiceData, lineItems },
      }));
    }
    throw error;
  });
}


export async function deleteInvoice(userId: string, invoiceId: string): Promise<void> {
  const db = getDb();
  const orgId = await getCurrentOrgId();

  const invoiceRef = doc(db, INVOICES_COLLECTION, invoiceId);
  const invoiceSnap = await getDoc(invoiceRef);
  if (!invoiceSnap.exists() || invoiceSnap.data().orgId !== orgId) return;

  // Find line items first to delete them in batch
  const lineItemsQuery = query(
    collection(db, LINE_ITEMS_COLLECTION),
    where('orgId', '==', orgId),
    where("invoiceId", "==", invoiceId)
  );
  const lineItemsSnapshot = await getDocs(lineItemsQuery);

  const batch = writeBatch(db);

  batch.delete(invoiceRef);

  lineItemsSnapshot.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit().catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'batch',
        operation: 'delete',
      }));
    }
    throw error;
  });
}

export async function postInvoicePayment(userId: string, invoiceId: string, amount: number, date: string, depositAccount: string): Promise<void> {
  const db = getDb();
  const orgId = await getCurrentOrgId();
  const invoiceRef = doc(db, INVOICES_COLLECTION, invoiceId);
  const invoiceSnap = await getDoc(invoiceRef);

  if (!invoiceSnap.exists()) throw new Error("Invoice not found.");
  if (invoiceSnap.data().orgId !== orgId) throw new Error('Invoice not found for current organization.');

  const invoiceData = docToInvoice(invoiceSnap);
  const newAmountPaid = (invoiceData.amountPaid || 0) + amount;
  const isFullyPaid = newAmountPaid >= invoiceData.originalAmount - 0.01;

  const batch = writeBatch(db);

  batch.update(invoiceRef, {
    amountPaid: newAmountPaid,
    status: isFullyPaid ? 'paid' : 'partially_paid'
  });

  const incomeRef = doc(collection(db, INCOME_COLLECTION));
  const primaryIncomeLine = t2125IncomeCategories.find(c => c.key === 'sales')?.line;

  const incomeData = {
    userId,
    date,
    company: invoiceData.companyName,
    description: `Payment for Invoice #${invoiceData.invoiceNumber ?? ''}`,
    totalAmount: amount,
    incomeCategory: primaryIncomeLine || 'Part 3A',
    depositedTo: depositAccount,
    type: 'business',
    documentNumber: invoiceData.invoiceNumber ?? "",
    paymentMethod: 'Bank Transfer'
  };
  batch.set(incomeRef, incomeData);

  batch.commit().catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'batch',
        operation: 'write',
        requestResourceData: incomeData,
      }));
    }
  });
}

// --- Reconciliation Orchestration ---

/**
 * Permanently links a ledger entry to a bank transaction.
 */
export async function reconcileLedgerEntry(entryId: string, type: 'income' | 'expense', bankReferenceId: string): Promise<void> {
  const db = getDb();
  const collectionName = type === 'income' ? INCOME_COLLECTION : EXPENSE_COLLECTION;
  const docRef = doc(db, collectionName, entryId);

  await updateDoc(docRef, {
    isReconciled: true,
    bankReferenceId: bankReferenceId,
  }).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: { isReconciled: true, bankReferenceId },
      }));
    }
  });
}

/**
 * High-fidelity sync: Posts a payment for an invoice AND reconciles it in one step.
 */
export async function reconcileInvoicePayment(userId: string, invoiceId: string, amount: number, date: string, bankReferenceId: string, account: string): Promise<void> {
  const db = getDb();
  const invoiceRef = doc(db, INVOICES_COLLECTION, invoiceId);
  const invoiceSnap = await getDoc(invoiceRef);
  if (!invoiceSnap.exists()) return;

  const data = invoiceSnap.data();
  const newPaid = (data.amountPaid || 0) + amount;
  const isPaid = newPaid >= data.originalAmount - 0.01;

  const batch = writeBatch(db);
  batch.update(invoiceRef, {
    amountPaid: newPaid,
    status: isPaid ? 'paid' : 'partially_paid'
  });

  const incomeRef = doc(collection(db, INCOME_COLLECTION));
  const primaryIncomeLine = t2125IncomeCategories.find(c => c.key === 'sales')?.line;
  batch.set(incomeRef, {
    userId,
    date,
    company: data.companyName,
    description: `Reconciled payment for Invoice #${data.invoiceNumber}`,
    totalAmount: amount,
    incomeCategory: primaryIncomeLine || 'Part 3A',
    depositedTo: account,
    type: 'business',
    isReconciled: true,
    bankReferenceId: bankReferenceId,
    paymentMethod: 'Bank Transfer'
  });

  await batch.commit();
}

/**
 * High-fidelity sync: Posts a payment for a bill AND reconciles it in one step.
 */
export async function reconcileBillPayment(userId: string, billId: string, date: string, bankReferenceId: string, account: string): Promise<void> {
  const db = getDb();
  const billRef = doc(db, PAYABLES_COLLECTION, billId);
  const billSnap = await getDoc(billRef);
  if (!billSnap.exists()) return;

  const data = billSnap.data();
  const batch = writeBatch(db);

  const expenseRef = doc(collection(db, EXPENSE_COLLECTION));
  batch.set(expenseRef, {
    userId,
    date,
    company: data.vendor,
    description: `Reconciled payment for Bill #${data.invoiceNumber || 'N/A'}`,
    totalAmount: data.totalAmount,
    category: data.category,
    paidFrom: account,
    type: 'business',
    isReconciled: true,
    bankReferenceId: bankReferenceId,
    paymentMethod: 'Bank Transfer'
  });

  batch.delete(billRef);
  await batch.commit();
}

// --- Income ---
const docToIncome = (doc: any): IncomeTransaction => ({ id: doc.id, ...doc.data() } as IncomeTransaction);

export async function getIncomeTransactions(userId: string): Promise<IncomeTransaction[]> {
  const db = getDb();
  const orgId = await getCurrentOrgId();
  const q = query(collection(db, INCOME_COLLECTION), where("orgId", "==", orgId));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToIncome).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: INCOME_COLLECTION,
        operation: 'list',
      }));
    }
    throw error;
  }
}

export async function addIncomeTransaction(data: Omit<IncomeTransaction, 'id'>): Promise<IncomeTransaction> {
  const db = getDb();
  const docRef = doc(collection(db, INCOME_COLLECTION));
  const newTransaction = { id: docRef.id, ...data };

  setDoc(docRef, data).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'create',
        requestResourceData: data,
      }));
    }
  });

  return newTransaction;
}

export async function updateIncomeTransaction(id: string, data: Partial<Omit<IncomeTransaction, 'id' | 'userId'>>): Promise<void> {
  const db = getDb();
  const docRef = doc(db, INCOME_COLLECTION, id);
  updateDoc(docRef, data).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: data,
      }));
    }
  });
}

export async function deleteIncomeTransaction(id: string): Promise<void> {
  const db = getDb();
  const docRef = doc(db, INCOME_COLLECTION, id);
  deleteDoc(docRef).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      }));
    }
  });
}

export async function deleteIncomeTransactions(ids: string[]): Promise<void> {
  const db = getDb();
  const batch = writeBatch(db);
  ids.forEach(id => batch.delete(doc(db, INCOME_COLLECTION, id)));
  await batch.commit().catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'batch',
        operation: 'delete',
      }));
    }
  });
}


// --- Expense ---
const docToExpense = (doc: any): ExpenseTransaction => ({ id: doc.id, ...doc.data() } as ExpenseTransaction);

export async function getExpenseTransactions(userId: string): Promise<ExpenseTransaction[]> {
  const db = getDb();
  const orgId = await getCurrentOrgId();
  const q = query(collection(db, EXPENSE_COLLECTION), where("orgId", "==", orgId));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToExpense).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: EXPENSE_COLLECTION,
        operation: 'list',
      }));
    }
    throw error;
  }
}

export async function addExpenseTransaction(data: Omit<ExpenseTransaction, 'id'>): Promise<ExpenseTransaction> {
  const db = getDb();
  const docRef = doc(collection(db, EXPENSE_COLLECTION));
  const newTransaction = { id: docRef.id, ...data };

  setDoc(docRef, data).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'create',
        requestResourceData: data,
      }));
    }
  });

  return newTransaction;
}

export async function updateExpenseTransaction(id: string, data: Partial<Omit<ExpenseTransaction, 'id' | 'userId'>>): Promise<void> {
  const db = getDb();
  const docRef = doc(db, EXPENSE_COLLECTION, id);
  updateDoc(docRef, data).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: data,
      }));
    }
  });
}

export async function deleteExpenseTransaction(id: string): Promise<void> {
  const db = getDb();
  const docRef = doc(db, EXPENSE_COLLECTION, id);
  deleteDoc(docRef).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      }));
    }
  });
}

export async function deleteExpenseTransactions(ids: string[]): Promise<void> {
  const db = getDb();
  const batch = writeBatch(db);
  ids.forEach(id => batch.delete(doc(db, EXPENSE_COLLECTION, id)));
  await batch.commit().catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'batch',
        operation: 'delete',
      }));
    }
  });
}

// --- Accounts Payable ---
const docToPayableBill = (doc: any): PayableBill => {
  const data = doc.data();
  return { id: doc.id, ...data, totalAmount: data.totalAmount ?? 0 } as PayableBill;
};

export async function getPayableBills(userId: string): Promise<PayableBill[]> {
  const db = getDb();
  const orgId = await getCurrentOrgId();
  const q = query(collection(db, PAYABLES_COLLECTION), where("orgId", "==", orgId));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToPayableBill).sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: PAYABLES_COLLECTION,
        operation: 'list',
      }));
    }
    throw error;
  }
}

export async function addPayableBill(data: Omit<PayableBill, 'id'>): Promise<PayableBill> {
  const db = getDb();
  const docRef = doc(collection(db, PAYABLES_COLLECTION));
  const newBill = { id: docRef.id, ...data };

  setDoc(docRef, data).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'create',
        requestResourceData: data,
      }));
    }
  });

  return newBill;
}

export async function updatePayableBill(id: string, data: Partial<Omit<PayableBill, 'id' | 'userId'>>): Promise<void> {
  const db = getDb();
  const docRef = doc(db, PAYABLES_COLLECTION, id);
  updateDoc(docRef, data).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: data,
      }));
    }
  });
}

export async function deletePayableBill(id: string): Promise<void> {
  const db = getDb();
  const docRef = doc(db, PAYABLES_COLLECTION, id);
  deleteDoc(docRef).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      }));
    }
  });
}

export async function postBillPayment(userId: string, billId: string, paymentDate: string, paymentMethod: string): Promise<void> {
  const db = getDb();
  const billRef = doc(db, PAYABLES_COLLECTION, billId);
  const billSnap = await getDoc(billRef);

  if (!billSnap.exists()) throw new Error("Bill not found.");

  const billData = docToPayableBill(billSnap);
  const batch = writeBatch(db);

  const expenseRef = doc(collection(db, EXPENSE_COLLECTION));
  const expenseData = {
    userId,
    date: paymentDate,
    company: billData.vendor,
    description: `Payment for Bill #${billData.invoiceNumber ?? ''}: ${billData.description || ''}`,
    totalAmount: billData.totalAmount,
    preTaxAmount: billData.preTaxAmount ?? billData.totalAmount,
    taxAmount: billData.taxAmount ?? 0,
    taxRate: billData.taxRate ?? 0,
    category: billData.category,
    type: 'business',
    documentNumber: billData.invoiceNumber ?? "",
    documentUrl: billData.documentUrl ?? "",
    paymentMethod: paymentMethod
  };
  batch.set(expenseRef, expenseData);
  batch.delete(billRef);

  batch.commit().catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'batch',
        operation: 'write',
        requestResourceData: expenseData,
      }));
    }
  });
}

// --- Petty Cash ---
const docToPettyCash = (doc: any): PettyCashTransaction => ({ id: doc.id, ...doc.data() } as PettyCashTransaction);

export async function getPettyCashTransactions(userId: string): Promise<PettyCashTransaction[]> {
  const db = getDb();
  const orgId = await getCurrentOrgId();
  const q = query(collection(db, PETTY_CASH_COLLECTION), where("orgId", "==", orgId));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToPettyCash).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: PETTY_CASH_COLLECTION,
        operation: 'list',
      }));
    }
    throw error;
  }
}

export async function addPettyCashTransaction(data: Omit<PettyCashTransaction, 'id'>): Promise<PettyCashTransaction> {
  const db = getDb();
  const docRef = doc(collection(db, PETTY_CASH_COLLECTION));
  const newTx = { id: docRef.id, ...data };
  setDoc(docRef, data).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'create',
        requestResourceData: data,
      }));
    }
  });
  return newTx;
}

export async function updatePettyCashTransaction(id: string, data: Partial<Omit<PettyCashTransaction, 'id' | 'userId'>>): Promise<void> {
  const db = getDb();
  const docRef = doc(db, PETTY_CASH_COLLECTION, id);
  updateDoc(docRef, data).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: data,
      }));
    }
  });
}

export async function deletePettyCashTransaction(id: string): Promise<void> {
  const db = getDb();
  const docRef = doc(db, PETTY_CASH_COLLECTION, id);
  deleteDoc(docRef).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      }));
    }
  });
}

export async function postPettyCashToGL(userId: string, txId: string): Promise<void> {
  const db = getDb();
  const txRef = doc(db, PETTY_CASH_COLLECTION, txId);
  const txSnap = await getDoc(txRef);
  if (!txSnap.exists()) throw new Error("Transaction not found.");

  const txData = docToPettyCash(txSnap);
  const batch = writeBatch(db);

  if (txData.type === 'in') {
    const incomeRef = doc(collection(db, INCOME_COLLECTION));
    batch.set(incomeRef, {
      userId,
      date: txData.date,
      company: txData.contact,
      description: txData.description,
      totalAmount: txData.amount,
      incomeCategory: txData.category,
      depositedTo: 'Petty Cash Box',
      type: 'business',
      paymentMethod: 'Cash'
    });
  } else {
    const expenseRef = doc(collection(db, EXPENSE_COLLECTION));
    batch.set(expenseRef, {
      userId,
      date: txData.date,
      company: txData.contact,
      description: txData.description,
      totalAmount: txData.amount,
      category: txData.category,
      paidFrom: 'Petty Cash Box',
      type: 'business',
      paymentMethod: 'Cash'
    });
  }

  batch.update(txRef, { isPosted: true });
  batch.commit().catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'batch',
        operation: 'write',
      }));
    }
  });
}

// --- Asset Management ---
export interface DepreciationEntry {
  id: string;
  date: string;
  amount: number;
}

export interface Asset {
  id: string;
  name: string;
  description?: string;
  assetClass?: string;
  purchaseDate: string;
  cost: number;
  undepreciatedCapitalCost: number;
  applyHalfYearRule: boolean;
  depreciationEntries?: DepreciationEntry[];
  userId: string;
}

const docToAsset = (doc: any): Asset => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    applyHalfYearRule: data.applyHalfYearRule !== false,
    depreciationEntries: data.depreciationEntries || []
  } as Asset
};

export async function getAssets(userId: string): Promise<Asset[]> {
  const db = getDb();
  const orgId = await getCurrentOrgId();
  const q = query(collection(db, ASSETS_COLLECTION), where("orgId", "==", orgId));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToAsset).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: ASSETS_COLLECTION,
        operation: 'list',
      }));
    }
    throw error;
  }
}

export async function addAsset(data: Omit<Asset, 'id'>): Promise<Asset> {
  const db = getDb();
  const docRef = doc(collection(db, ASSETS_COLLECTION));
  const newAsset = { id: docRef.id, ...data };
  setDoc(docRef, data).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'create',
        requestResourceData: data,
      }));
    }
  });
  return newAsset;
}

export async function updateAsset(id: string, data: Partial<Omit<Asset, 'id' | 'userId'>>): Promise<void> {
  const db = getDb();
  const docRef = doc(db, ASSETS_COLLECTION, id);
  updateDoc(docRef, data).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: data,
      }));
    }
  });
}

export async function deleteAsset(id: string): Promise<void> {
  const db = getDb();
  const docRef = doc(db, ASSETS_COLLECTION, id);
  deleteDoc(docRef).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      }));
    }
  });
}


// --- Equity ---
export interface EquityTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'contribution' | 'draw';
  userId: string;
}

const docToEquityTransaction = (doc: any): EquityTransaction => ({ id: doc.id, ...doc.data() } as EquityTransaction);

export async function getEquityTransactions(userId: string): Promise<EquityTransaction[]> {
  const db = getDb();
  const orgId = await getCurrentOrgId();
  const q = query(collection(db, EQUITY_COLLECTION), where("orgId", "==", orgId));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToEquityTransaction).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: EQUITY_COLLECTION,
        operation: 'list',
      }));
    }
    throw error;
  }
}

export async function addEquityTransaction(data: Omit<EquityTransaction, 'id'>): Promise<EquityTransaction> {
  const db = getDb();
  const docRef = doc(collection(db, EQUITY_COLLECTION));
  const newTransaction = { id: docRef.id, ...data };
  setDoc(docRef, data).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'create',
        requestResourceData: data,
      }));
    }
  });
  return newTransaction;
}

export async function updateEquityTransaction(id: string, data: Partial<Omit<EquityTransaction, 'id' | 'userId'>>): Promise<void> {
  const db = getDb();
  const docRef = doc(db, EQUITY_COLLECTION, id);
  updateDoc(docRef, data).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: data,
      }));
    }
  });
}

export async function deleteEquityTransaction(id: string): Promise<void> {
  const db = getDb();
  const docRef = doc(db, EQUITY_COLLECTION, id);
  deleteDoc(docRef).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      }));
    }
  });
}

// --- Loan ---
export interface Loan {
  id: string;
  loanType: 'payable' | 'receivable';
  counterparty: string;
  originalAmount: number;
  outstandingBalance: number;
  interestRate?: number;
  termMonths?: number;
  monthlyPayment?: number;
  startDate: string;
  userId: string;
}

const docToLoan = (doc: any): Loan => ({ id: doc.id, ...doc.data() } as Loan);

export async function getLoans(userId: string): Promise<Loan[]> {
  const db = getDb();
  const orgId = await getCurrentOrgId();
  const q = query(collection(db, LOANS_COLLECTION), where("orgId", "==", orgId));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToLoan).sort((a, b) => a.counterparty.localeCompare(b.counterparty));
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: LOANS_COLLECTION,
        operation: 'list',
      }));
    }
    throw error;
  }
}

export async function addLoan(data: Omit<Loan, 'id'>): Promise<Loan> {
  const db = getDb();
  const docRef = collection(db, LOANS_COLLECTION);
  const newLoanDoc = await addDoc(docRef, data).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: LOANS_COLLECTION,
        operation: 'create',
        requestResourceData: data,
      }));
    }
    throw error;
  });
  return { id: newLoanDoc.id, ...data };
}

export async function updateLoan(id: string, data: Partial<Omit<Loan, 'id' | 'userId'>>): Promise<void> {
  const db = getDb();
  const docRef = doc(db, LOANS_COLLECTION, id);
  updateDoc(docRef, data).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: data,
      }));
    }
  });
}

export async function deleteLoan(id: string): Promise<void> {
  const db = getDb();
  const docRef = doc(db, LOANS_COLLECTION, id);
  deleteDoc(docRef).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      }));
    }
  });
}


// --- Company ---
export interface Company {
  id: string;
  orgId?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  name: string;
  userId: string;
}

const docToCompany = (doc: any): Company => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: toClientDate(data.createdAt),
    updatedAt: toClientDate(data.updatedAt),
  } as Company;
};

export async function getCompanies(_userId: string): Promise<Company[]> {
  const db = getDb();
  const orgId = await getCurrentOrgId();
  const q = query(collection(db, COMPANIES_COLLECTION), where('orgId', '==', orgId));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToCompany).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: COMPANIES_COLLECTION,
        operation: 'list',
      }));
    }
    throw error;
  }
}

export async function addCompany(data: Omit<Company, 'id'>): Promise<Company> {
  const db = getDb();
  const currentUser = getCurrentAuthContext();
  const orgId = await getCurrentOrgId();
  const dataToSave = {
    ...data,
    orgId,
    createdBy: currentUser.uid,
    updatedBy: currentUser.uid,
    createdAt: data.createdAt || new Date(),
    updatedAt: new Date(),
  };
  const docRef = collection(db, COMPANIES_COLLECTION);
  const newCompanyDoc = await addDoc(docRef, dataToSave).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: COMPANIES_COLLECTION,
        operation: 'create',
        requestResourceData: dataToSave,
      }));
    }
    throw error;
  });
  return docToCompany({ id: newCompanyDoc.id, data: () => dataToSave });
}

// --- Category Base ---
export interface BaseCategory {
  id: string;
  name: string;
  userId: string;
  isArchived?: boolean;
  categoryNumber?: string;
  explanation?: string;
}
export interface IncomeCategory extends BaseCategory { }
export interface ExpenseCategory extends BaseCategory { }

const docToIncomeCategory = (doc: any): IncomeCategory => ({ id: doc.id, ...doc.data() } as IncomeCategory);
const docToExpenseCategory = (doc: any): ExpenseCategory => ({ id: doc.id, ...doc.data() } as ExpenseCategory);


async function getCategories<T extends BaseCategory>(
  userId: string,
  collectionName: string,
  standardCategories: any[],
  docConverter: (doc: any) => T,
  transactionCollectionName: string,
  categoryFieldName: string
): Promise<T[]> {
  const db = getDb();
  const currentUser = getCurrentAuthContext();
  const orgId = await getCurrentOrgId();
  const q = query(collection(db, collectionName), where('orgId', '==', orgId));
  let existingCategories: T[] = [];
  try {
    const snapshot = await getDocs(q);
    existingCategories = snapshot.docs.map(docConverter);
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: collectionName,
        operation: 'list',
      }));
    }
    throw error;
  }

  const batch = writeBatch(db);
  let hasWrites = false;

  const existingByNumber = new Map(existingCategories.map(c => [c.categoryNumber, c]));

  for (const stdCat of standardCategories) {
    if (!existingByNumber.has(stdCat.line)) {
      const docRef = doc(collection(db, collectionName));
      batch.set(docRef, {
        name: stdCat.description,
        userId,
        orgId,
        createdBy: currentUser.uid,
        updatedBy: currentUser.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
        categoryNumber: stdCat.line,
        explanation: stdCat.explanation,
        isArchived: false
      });
      hasWrites = true;
    }
  }

  if (hasWrites) {
    await batch.commit().catch(async (error) => {
      if (error.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'batch',
          operation: 'write',
        }));
      }
    });

    // Re-fetch to get the newly created IDs or just update the list
    const updatedSnapshot = await getDocs(q);
    return updatedSnapshot.docs.map(docConverter).sort((a, b) => a.name.localeCompare(b.name));
  }

  return existingCategories.sort((a, b) => a.name.localeCompare(b.name));
}


export async function getIncomeCategories(userId: string): Promise<IncomeCategory[]> {
  return getCategories<IncomeCategory>(userId, INCOME_CATEGORIES_COLLECTION, t2125IncomeCategories, docToIncomeCategory, INCOME_COLLECTION, 'incomeCategory');
}

export async function addIncomeCategory(data: { name: string, userId: string, categoryNumber?: string }): Promise<IncomeCategory> {
  const db = getDb();
  const currentUser = getCurrentAuthContext();
  const orgId = await getCurrentOrgId();
  const { name, userId, categoryNumber } = data;
  const allCategories = await getIncomeCategories(userId);

  let finalCategoryNumber = categoryNumber?.trim();
  if (!finalCategoryNumber) {
    const customCategories = allCategories.filter(c => c.categoryNumber && c.categoryNumber.startsWith('C-'));
    const highestCustomNum = customCategories.reduce((max, cat) => {
      const num = parseInt(cat.categoryNumber!.substring(2));
      return num > max ? num : max;
    }, 0);
    finalCategoryNumber = `C-${highestCustomNum + 1}`;
  }

  const dataToSave = {
    name: name.trim(),
    userId,
    orgId,
    createdBy: currentUser.uid,
    updatedBy: currentUser.uid,
    createdAt: new Date(),
    updatedAt: new Date(),
    categoryNumber: finalCategoryNumber,
    isArchived: false,
  };
  const docRef = doc(collection(db, INCOME_CATEGORIES_COLLECTION));
  await setDoc(docRef, dataToSave).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'create',
        requestResourceData: dataToSave,
      }));
    }
    throw error;
  });
  return { id: docRef.id, ...dataToSave };
}

export async function updateIncomeCategory(id: string, data: Partial<Omit<IncomeCategory, 'id' | 'userId'>>): Promise<void> {
  const db = getDb();
  const docRef = doc(db, INCOME_CATEGORIES_COLLECTION, id);
  await updateDoc(docRef, data).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: data,
      }));
    }
    throw error;
  });
}
export async function deleteIncomeCategory(id: string): Promise<void> {
  const db = getDb();
  const docRef = doc(db, INCOME_CATEGORIES_COLLECTION, id);
  await deleteDoc(docRef).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      }));
    }
    throw error;
  });
}

export async function getExpenseCategories(userId: string): Promise<ExpenseCategory[]> {
  return getCategories<ExpenseCategory>(userId, EXPENSE_CATEGORIES_COLLECTION, t2125ExpenseCategories, docToExpenseCategory, EXPENSE_COLLECTION, 'category');
}

export async function addExpenseCategory(data: { name: string, userId: string, categoryNumber?: string }): Promise<ExpenseCategory> {
  const db = getDb();
  const currentUser = getCurrentAuthContext();
  const orgId = await getCurrentOrgId();
  const { name, userId, categoryNumber } = data;
  const allCategories = await getExpenseCategories(userId);

  let finalCategoryNumber = categoryNumber?.trim();
  if (!finalCategoryNumber) {
    const customCategories = allCategories.filter(c => c.categoryNumber && c.categoryNumber.startsWith('C-'));
    const highestCustomNum = customCategories.reduce((max, cat) => {
      const num = parseInt(cat.categoryNumber!.substring(2));
      return num > max ? num : max;
    }, 0);
    finalCategoryNumber = `C-${highestCustomNum + 1}`;
  }

  const dataToSave = {
    name: name.trim(),
    userId,
    orgId,
    createdBy: currentUser.uid,
    updatedBy: currentUser.uid,
    createdAt: new Date(),
    updatedAt: new Date(),
    categoryNumber: finalCategoryNumber,
    isArchived: false,
  };
  const docRef = doc(collection(db, EXPENSE_CATEGORIES_COLLECTION));
  await setDoc(docRef, dataToSave).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'create',
        requestResourceData: dataToSave,
      }));
    }
    throw error;
  });
  return { id: docRef.id, ...dataToSave };
}
export async function updateExpenseCategory(id: string, data: Partial<Omit<ExpenseCategory, 'id' | 'userId'>>): Promise<void> {
  const db = getDb();
  const docRef = doc(db, EXPENSE_CATEGORIES_COLLECTION, id);
  await updateDoc(docRef, data).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: data,
      }));
    }
    throw error;
  });
}
export async function deleteExpenseCategory(id: string): Promise<void> {
  const db = getDb();
  const docRef = doc(db, EXPENSE_CATEGORIES_COLLECTION, id);
  await deleteDoc(docRef).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      }));
    }
    throw error;
  });
}


export async function getServiceItems(_userId: string): Promise<ServiceItem[]> {
  const db = getDb();
  const orgId = await getCurrentOrgId();
  const q = query(collection(db, SERVICE_ITEMS_COLLECTION), where('orgId', '==', orgId));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToServiceItem).sort((a, b) => a.description.localeCompare(b.description));
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: SERVICE_ITEMS_COLLECTION,
        operation: 'list',
      }));
    }
    throw error;
  }
}

export async function addServiceItem(data: Omit<ServiceItem, 'id'>): Promise<ServiceItem> {
  const db = getDb();
  const currentUser = getCurrentAuthContext();
  const orgId = await getCurrentOrgId();
  const dataToSave = {
    ...data,
    orgId,
    createdBy: currentUser.uid,
    updatedBy: currentUser.uid,
    createdAt: data.createdAt || new Date(),
    updatedAt: new Date(),
  };
  const docRef = await addDoc(collection(db, SERVICE_ITEMS_COLLECTION), dataToSave).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: SERVICE_ITEMS_COLLECTION,
        operation: 'create',
        requestResourceData: dataToSave,
      }));
    }
    throw error;
  });
  return docToServiceItem({ id: docRef.id, data: () => dataToSave });
}

export async function updateServiceItem(id: string, data: Partial<Omit<ServiceItem, 'id' | 'userId'>>): Promise<void> {
  const db = getDb();
  const currentUser = getCurrentAuthContext();
  const orgId = await getCurrentOrgId();
  const docRef = doc(db, SERVICE_ITEMS_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists() || docSnap.data().orgId !== orgId) return;
  await updateDoc(docRef, {
    ...data,
    orgId,
    updatedBy: currentUser.uid,
    updatedAt: new Date(),
  }).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: data,
      }));
    }
  });
}

export async function deleteServiceItem(id: string): Promise<void> {
  const db = getDb();
  const orgId = await getCurrentOrgId();
  const docRef = doc(db, SERVICE_ITEMS_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists() || docSnap.data().orgId !== orgId) return;
  await deleteDoc(docRef).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      }));
    }
  });
}

const docToTaxType = (doc: any): TaxType => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: toClientDate(data.createdAt),
    updatedAt: toClientDate(data.updatedAt),
  } as TaxType;
};

export async function getTaxTypes(_userId: string): Promise<TaxType[]> {
  const db = getDb();
  const orgId = await getCurrentOrgId();
  const q = query(collection(db, TAX_TYPES_COLLECTION), where('orgId', '==', orgId));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToTaxType).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: TAX_TYPES_COLLECTION,
        operation: 'list',
      }));
    }
    throw error;
  }
}

export async function addTaxType(data: Omit<TaxType, 'id'>): Promise<TaxType> {
  const db = getDb();
  const currentUser = getCurrentAuthContext();
  const orgId = await getCurrentOrgId();
  const dataToSave = {
    ...data,
    orgId,
    createdBy: currentUser.uid,
    updatedBy: currentUser.uid,
    createdAt: data.createdAt || new Date(),
    updatedAt: new Date(),
  };
  const docRef = await addDoc(collection(db, TAX_TYPES_COLLECTION), dataToSave).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: TAX_TYPES_COLLECTION,
        operation: 'create',
        requestResourceData: dataToSave,
      }));
    }
    throw error;
  });
  return docToTaxType({ id: docRef.id, data: () => dataToSave });
}

export async function updateTaxType(id: string, data: Partial<Omit<TaxType, 'id' | 'userId'>>): Promise<void> {
  const db = getDb();
  const currentUser = getCurrentAuthContext();
  const orgId = await getCurrentOrgId();
  const docRef = doc(db, TAX_TYPES_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists() || docSnap.data().orgId !== orgId) return;
  await updateDoc(docRef, {
    ...data,
    orgId,
    updatedBy: currentUser.uid,
    updatedAt: new Date(),
  }).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: data,
      }));
    }
  });
}

export async function deleteTaxType(id: string): Promise<void> {
  const db = getDb();
  const orgId = await getCurrentOrgId();
  const docRef = doc(db, TAX_TYPES_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists() || docSnap.data().orgId !== orgId) return;
  await deleteDoc(docRef).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      }));
    }
  });
}

export async function addRemittance(remittance: any) {
  const db = getDb();
  const docRef = doc(collection(db, REMITTANCES_COLLECTION));
  setDoc(docRef, remittance).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'create',
        requestResourceData: remittance,
      }));
    }
  });
}

export async function archiveIncomeCategory(userId: string, id: string): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, INCOME_CATEGORIES_COLLECTION, id), { isArchived: true });
}

export async function restoreIncomeCategory(id: string): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, INCOME_CATEGORIES_COLLECTION, id), { isArchived: false });
}

export async function archiveExpenseCategory(userId: string, id: string): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, EXPENSE_CATEGORIES_COLLECTION, id), { isArchived: true });
}

export async function restoreExpenseCategory(id: string): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, EXPENSE_CATEGORIES_COLLECTION, id), { isArchived: false });
}

export async function mergeCategories(userId: string, sourceId: string, targetCategoryNumber: string, type: 'income' | 'expense'): Promise<void> {
  const db = getDb();
  const batch = writeBatch(db);

  const transactionCol = type === 'income' ? INCOME_COLLECTION : EXPENSE_COLLECTION;
  const categoryField = type === 'income' ? 'incomeCategory' : 'category';
  const categoryCol = type === 'income' ? INCOME_CATEGORIES_COLLECTION : EXPENSE_CATEGORIES_COLLECTION;

  const sourceRef = doc(db, categoryCol, sourceId);
  const sourceSnap = await getDoc(sourceRef);
  if (!sourceSnap.exists()) return;
  const sourceData = sourceSnap.data();

  const orgId = await getCurrentOrgId();
  const q = query(collection(db, transactionCol), where("orgId", "==", orgId), where(categoryField, "==", sourceData.categoryNumber));
  const snapshot = await getDocs(q);

  snapshot.forEach(tDoc => {
    batch.update(tDoc.ref, { [categoryField]: targetCategoryNumber });
  });

  batch.delete(sourceRef);
  await batch.commit();
}

export async function deleteIncomeCategories(ids: string[]): Promise<void> {
  const db = getDb();
  const batch = writeBatch(db);
  ids.forEach(id => batch.delete(doc(db, INCOME_CATEGORIES_COLLECTION, id)));
  await batch.commit();
}

export async function deleteExpenseCategories(ids: string[]): Promise<void> {
  const db = getDb();
  const batch = writeBatch(db);
  ids.forEach(id => batch.delete(doc(db, EXPENSE_CATEGORIES_COLLECTION, id)));
  await batch.commit();
}

export async function getInternalAccounts(userId: string): Promise<InternalAccount[]> {
  const db = getDb();
  const orgId = await getCurrentOrgId();
  const q = query(collection(db, INTERNAL_ACCOUNT_COLLECTION), where("orgId", "==", orgId));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InternalAccount)).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: INTERNAL_ACCOUNT_COLLECTION,
        operation: 'list',
      }));
    }
    throw error;
  }
}

export async function addInternalAccount(data: Omit<InternalAccount, 'id'>): Promise<InternalAccount> {
  const db = getDb();
  const docRef = doc(collection(db, INTERNAL_ACCOUNT_COLLECTION));
  const newAcc = { id: docRef.id, ...data };

  setDoc(docRef, data).catch(async (error) => {
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: 'create',
        requestResourceData: data,
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    }
  });

  return newAcc;
}

export async function updateInternalAccount(id: string, data: Partial<Omit<InternalAccount, 'id' | 'userId'>>): Promise<void> {
  const db = getDb();
  const docRef = doc(db, INTERNAL_ACCOUNT_COLLECTION, id);
  updateDoc(docRef, data).catch(async (error) => {
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: data,
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    }
  });
}

export async function deleteInternalAccount(id: string): Promise<void> {
  const db = getDb();
  const docRef = doc(db, INTERNAL_ACCOUNT_COLLECTION, id);
  deleteDoc(docRef).catch(async (error) => {
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    }
  });
}
