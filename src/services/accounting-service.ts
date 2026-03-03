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
  name: string;
  rate: number;
  userId: string;
}

export interface InternalAccount {
    id: string;
    name: string;
    type: 'Bank' | 'Credit Card' | 'Cash' | 'Other';
    userId: string;
}

// --- Invoice Interfaces & Functions ---
export interface InvoiceLineItem {
  id?: string;
  invoiceId: string;
  description: string;
  quantity: number;
  price: number;
  totalAmount?: number;
  preTaxAmount?: number;
  taxAmount?: number;
  taxType?: string;
  taxRate?: number;
  userId: string;
}

export interface Invoice {
  id: string;
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
  createdAt: Date;
}

export interface ServiceItem {
  id: string;
  description: string;
  price: number;
  taxType?: string;
  taxRate?: number;
  userId: string;
}

const INVOICES_COLLECTION = 'invoices';
const LINE_ITEMS_COLLECTION = 'invoiceLineItems';
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
        invoiceNumber: data.invoiceNumber,
        businessNumber: data.businessNumber,
        companyName: data.companyName,
        contactId: data.contactId,
        supplierId: data.supplierId || null,
        originalAmount: data.originalAmount,
        amountPaid: data.amountPaid || 0,
        dueDate: (data.dueDate as Timestamp)?.toDate ? (data.dueDate as Timestamp).toDate() : new Date(),
        invoiceDate: (data.invoiceDate as Timestamp)?.toDate ? (data.invoiceDate as Timestamp).toDate() : new Date(),
        status: data.status,
        notes: data.notes,
        taxType: data.taxType,
        userId: data.userId,
        createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate() : new Date(),
    } as Invoice;
};

const docToLineItem = (doc: any): InvoiceLineItem => {
    const data = doc.data();
    return {
        id: doc.id,
        invoiceId: data.invoiceId,
        description: data.description,
        quantity: data.quantity,
        price: data.price,
        totalAmount: data.totalAmount,
        preTaxAmount: data.preTaxAmount,
        taxAmount: data.taxAmount,
        taxType: data.taxType || '',
        taxRate: data.taxRate || 0,
        userId: data.userId,
    } as InvoiceLineItem;
};

const docToServiceItem = (doc: any): ServiceItem => ({ id: doc.id, ...doc.data() } as ServiceItem);

export async function getInvoices(userId: string): Promise<Invoice[]> {
  const db = getDb();
  const q = query(collection(db, INVOICES_COLLECTION), where("userId", "==", userId));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToInvoice).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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
    const docRef = doc(db, INVOICES_COLLECTION, invoiceId);
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
          return docToInvoice(docSnap);
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

export async function getLineItemsForInvoice(userId: string, invoiceId: string): Promise<InvoiceLineItem[]> {
    const db = getDb();
    const q = query(
        collection(db, LINE_ITEMS_COLLECTION), 
        where("userId", "==", userId),
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


export async function addInvoiceWithLineItems(
    invoiceData: Omit<Invoice, 'id' | 'createdAt'>, 
    lineItems: Omit<InvoiceLineItem, 'invoiceId' | 'id' | 'userId'>[]
): Promise<Invoice> {
    const db = getDb();
    const batch = writeBatch(db);

    const invoiceRef = doc(collection(db, INVOICES_COLLECTION));
    batch.set(invoiceRef, { ...invoiceData, createdAt: new Date() });

    lineItems.forEach(item => {
        const itemRef = doc(collection(db, LINE_ITEMS_COLLECTION));
        batch.set(itemRef, { ...item, invoiceId: invoiceRef.id, userId: invoiceData.userId });
    });

    batch.commit().catch(async (error) => {
      if (error.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'batch',
          operation: 'write',
          requestResourceData: { invoiceData, lineItems },
        }));
      }
    });

    return { id: invoiceRef.id, ...invoiceData, createdAt: new Date() };
}

export async function updateInvoiceWithLineItems(
    invoiceId: string, 
    invoiceData: Partial<Omit<Invoice, 'id' | 'userId'>>, 
    lineItems: Omit<InvoiceLineItem, 'id' | 'invoiceId' | 'userId'>[],
    userId: string
): Promise<void> {
    const db = getDb();
    
    // 1. Clear existing items
    const existingItemsQuery = query(
        collection(db, LINE_ITEMS_COLLECTION), 
        where("userId", "==", userId),
        where("invoiceId", "==", invoiceId)
    );
    const existingItemsSnapshot = await getDocs(existingItemsQuery);
    
    const batch = writeBatch(db);

    // 2. Update invoice metadata
    const invoiceRef = doc(db, INVOICES_COLLECTION, invoiceId);
    batch.update(invoiceRef, invoiceData);

    // 3. Delete old items
    existingItemsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });

    // 4. Set new items
    lineItems.forEach(item => {
        const itemRef = doc(collection(db, LINE_ITEMS_COLLECTION));
        batch.set(itemRef, { ...item, invoiceId, userId });
    });
    
    batch.commit().catch(async (error) => {
      if (error.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'batch',
          operation: 'write',
          requestResourceData: { invoiceData, lineItems },
        }));
      }
    });
}


export async function deleteInvoice(userId: string, invoiceId: string): Promise<void> {
    const db = getDb();
    
    // Find line items first to delete them in batch
    const lineItemsQuery = query(
        collection(db, LINE_ITEMS_COLLECTION), 
        where("userId", "==", userId),
        where("invoiceId", "==", invoiceId)
    );
    const lineItemsSnapshot = await getDocs(lineItemsQuery);
    
    const batch = writeBatch(db);
    
    const invoiceRef = doc(db, INVOICES_COLLECTION, invoiceId);
    batch.delete(invoiceRef);

    lineItemsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });
    
    batch.commit().catch(async (error) => {
      if (error.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'batch',
          operation: 'delete',
        }));
      }
    });
}

export async function postInvoicePayment(userId: string, invoiceId: string, amount: number, date: string, depositAccount: string): Promise<void> {
    const db = getDb();
    const invoiceRef = doc(db, INVOICES_COLLECTION, invoiceId);
    const invoiceSnap = await getDoc(invoiceRef);
    
    if (!invoiceSnap.exists()) throw new Error("Invoice not found.");
    
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
        description: `Payment for Invoice #${invoiceData.invoiceNumber}`,
        totalAmount: amount,
        incomeCategory: primaryIncomeLine || 'Part 3A',
        depositedTo: depositAccount,
        type: 'business',
        documentNumber: invoiceData.invoiceNumber,
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

// --- Income ---
const docToIncome = (doc: any): IncomeTransaction => ({ id: doc.id, ...doc.data() } as IncomeTransaction);

export async function getIncomeTransactions(userId: string): Promise<IncomeTransaction[]> {
    const db = getDb();
    const q = query(collection(db, INCOME_COLLECTION), where("userId", "==", userId));
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


// --- Expense ---
const docToExpense = (doc: any): ExpenseTransaction => ({ id: doc.id, ...doc.data() } as ExpenseTransaction);

export async function getExpenseTransactions(userId: string): Promise<ExpenseTransaction[]> {
    const db = getDb();
    const q = query(collection(db, EXPENSE_COLLECTION), where("userId", "==", userId));
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

// --- Accounts Payable ---
const docToPayableBill = (doc: any): PayableBill => {
    const data = doc.data();
    return { id: doc.id, ...data, totalAmount: data.totalAmount ?? 0 } as PayableBill;
};

export async function getPayableBills(userId: string): Promise<PayableBill[]> {
  const db = getDb();
  const q = query(collection(db, PAYABLES_COLLECTION), where("userId", "==", userId));
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
        description: `Payment for Bill #${billData.invoiceNumber}: ${billData.description}`,
        totalAmount: billData.totalAmount,
        preTaxAmount: billData.preTaxAmount || billData.totalAmount,
        taxAmount: billData.taxAmount || 0,
        taxRate: billData.taxRate || 0,
        category: billData.category,
        type: 'business',
        documentNumber: billData.invoiceNumber,
        documentUrl: billData.documentUrl,
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
    const q = query(collection(db, PETTY_CASH_COLLECTION), where("userId", "==", userId));
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
  const q = query(collection(db, ASSETS_COLLECTION), where("userId", "==", userId));
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
    const q = query(collection(db, EQUITY_COLLECTION), where("userId", "==", userId));
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
    const q = query(collection(db, LOANS_COLLECTION), where("userId", "==", userId));
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
    const docRef = doc(collection(db, LOANS_COLLECTION));
    const newLoan = { id: docRef.id, ...data };
    setDoc(docRef, data).catch(async (error) => {
      if (error.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'create',
          requestResourceData: data,
        }));
      }
    });
    return newLoan;
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
  name: string;
  userId: string;
}

const docToCompany = (doc: any): Company => ({ id: doc.id, ...doc.data() } as Company);

export async function getCompanies(userId: string): Promise<Company[]> {
  const db = getDb();
  const q = query(collection(db, COMPANIES_COLLECTION), where("userId", "==", userId));
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
  const docRef = collection(db, COMPANIES_COLLECTION);
  const newCompanyDoc = await addDoc(docRef, data).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: COMPANIES_COLLECTION,
        operation: 'create',
        requestResourceData: data,
      }));
    }
    throw error;
  });
  return { id: newCompanyDoc.id, ...data };
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
export interface IncomeCategory extends BaseCategory {}
export interface ExpenseCategory extends BaseCategory {}

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
  const q = query(collection(db, collectionName), where("userId", "==", userId));
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
              categoryNumber: stdCat.line, 
              explanation: stdCat.explanation, 
              isArchived: false 
          });
          hasWrites = true;
      }
  }

  if (hasWrites) {
    batch.commit().catch(async (error) => {
      if (error.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'batch',
          operation: 'write',
        }));
      }
    });
  }

  return existingCategories.sort((a,b) => a.name.localeCompare(b.name));
}


export async function getIncomeCategories(userId: string): Promise<IncomeCategory[]> {
  return getCategories<IncomeCategory>(userId, INCOME_CATEGORIES_COLLECTION, t2125IncomeCategories, docToIncomeCategory, INCOME_COLLECTION, 'incomeCategory');
}

export async function addIncomeCategory(data: { name: string, userId: string, categoryNumber?: string }): Promise<IncomeCategory> {
  const db = getDb();
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

  const dataToSave = { name: name.trim(), userId, categoryNumber: finalCategoryNumber, isArchived: false };
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
export async function deleteIncomeCategory(id: string): Promise<void> {
  const db = getDb();
  const docRef = doc(db, INCOME_CATEGORIES_COLLECTION, id);
  deleteDoc(docRef).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      }));
    }
  });
}

export async function getExpenseCategories(userId: string): Promise<ExpenseCategory[]> {
  return getCategories<ExpenseCategory>(userId, EXPENSE_CATEGORIES_COLLECTION, t2125ExpenseCategories, docToExpenseCategory, EXPENSE_COLLECTION, 'category');
}

export async function addExpenseCategory(data: { name: string, userId: string, categoryNumber?: string }): Promise<ExpenseCategory> {
  const db = getDb();
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

  const dataToSave = { name: name.trim(), userId, categoryNumber: finalCategoryNumber, isArchived: false };
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
export async function deleteExpenseCategory(id: string): Promise<void> {
  const db = getDb();
  const docRef = doc(db, EXPENSE_CATEGORIES_COLLECTION, id);
  deleteDoc(docRef).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      }));
    }
  });
}


export async function getServiceItems(userId: string): Promise<ServiceItem[]> {
  const db = getDb();
  const q = query(collection(db, SERVICE_ITEMS_COLLECTION), where("userId", "==", userId));
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
  const docRef = await addDoc(collection(db, SERVICE_ITEMS_COLLECTION), data).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: SERVICE_ITEMS_COLLECTION,
        operation: 'create',
        requestResourceData: data,
      }));
    }
    throw error;
  });
  return { id: docRef.id, ...data };
}

export async function updateServiceItem(id: string, data: Partial<Omit<ServiceItem, 'id' | 'userId'>>): Promise<void> {
  const db = getDb();
  const docRef = doc(db, SERVICE_ITEMS_COLLECTION, id);
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

export async function deleteServiceItem(id: string): Promise<void> {
  const db = getDb();
  const docRef = doc(db, SERVICE_ITEMS_COLLECTION, id);
  deleteDoc(docRef).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      }));
    }
  });
}

const docToTaxType = (doc: any): TaxType => ({ id: doc.id, ...doc.data() } as TaxType);

export async function getTaxTypes(userId: string): Promise<TaxType[]> {
  const db = getDb();
  const q = query(collection(db, TAX_TYPES_COLLECTION), where("userId", "==", userId));
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
  const docRef = await addDoc(collection(db, TAX_TYPES_COLLECTION), data).catch(async (error) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: TAX_TYPES_COLLECTION,
        operation: 'create',
        requestResourceData: data,
      }));
    }
    throw error;
  });
  return { id: docRef.id, ...data };
}

export async function updateTaxType(id: string, data: Partial<Omit<TaxType, 'id' | 'userId'>>): Promise<void> {
  const db = getDb();
  const docRef = doc(db, TAX_TYPES_COLLECTION, id);
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

export async function deleteTaxType(id: string): Promise<void> {
  const db = getDb();
  const docRef = doc(db, TAX_TYPES_COLLECTION, id);
  deleteDoc(docRef).catch(async (error) => {
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

    const q = query(collection(db, transactionCol), where("userId", "==", userId), where(categoryField, "==", sourceData.categoryNumber));
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
    const q = query(collection(db, INTERNAL_ACCOUNT_COLLECTION), where("userId", "==", userId));
    try {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InternalAccount)).sort((a,b) => a.name.localeCompare(b.name));
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
