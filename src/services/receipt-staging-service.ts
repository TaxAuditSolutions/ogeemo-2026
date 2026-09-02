'use client';

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';
import { addExpenseTransaction, addPayableBill } from '@/core/accounting-service';

export type ReceiptLedgerType = 'expense' | 'payable_bill' | 'income';

export interface ReceiptStagingItem {
  id: string;
  orgId?: string;
  userId?: string;
  createdAt?: Date | Timestamp | null;
  updatedAt?: Date | Timestamp | null;
  status: 'queued' | 'processing' | 'reviewed' | 'posted' | 'rejected';
  sourceType: 'phone_scan' | 'desktop_scan' | 'uploaded_pdf';
  driveFileId?: string;
  driveFileName?: string;
  driveFolderPath?: string;
  documentUrl?: string;
  extractedRawJson?: Record<string, unknown>;
  merchantName?: string;
  transactionDate?: string;
  netAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
  currency?: string;
  confidenceScore?: number;
  proposedLedgerType?: ReceiptLedgerType;
  proposedCategory?: string;
  proposedCompany?: string;
  proposedDescription?: string;
  businessReason?: string;
  auditReferenceId?: string;
  reviewedBy?: string;
  reviewedAt?: Date | Timestamp | null;
  postedAt?: Date | Timestamp | null;
  postedLedgerId?: string | null;
  postedLedgerCollection?: string | null;
}

const RECEIPT_QUEUE_COLLECTION = 'receiptStagingQueue';

function getDb() {
  return getFirebaseServices().db;
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
    console.warn('Receipt service: unable to read auth claims; falling back to user profile org lookup.', error);
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

  throw new Error('Receipt intake requires an active organization membership. Please sign in to your company workspace and verify your access.');
}

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && 'toDate' in value && typeof (value as Timestamp).toDate === 'function') {
    return (value as Timestamp).toDate();
  }
  return undefined;
}

const docToReceiptQueueItem = (snap: any): ReceiptStagingItem => {
  const data = snap.data() ?? {};
  return {
    id: snap.id,
    ...data,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    reviewedAt: toDate(data.reviewedAt),
    postedAt: toDate(data.postedAt),
  } as ReceiptStagingItem;
};

export async function getReceiptQueueItems(): Promise<ReceiptStagingItem[]> {
  const db = getDb();
  const orgId = await getCurrentOrgId();
  const q = query(collection(db, RECEIPT_QUEUE_COLLECTION), where('orgId', '==', orgId));
  const snap = await getDocs(q);
  return snap.docs
    .map(docToReceiptQueueItem)
    .filter((item) => item.status !== 'posted')
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt.toString()).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt.toString()).getTime() : 0;
      return bTime - aTime;
    });
}

export async function addReceiptQueueItem(data: Omit<ReceiptStagingItem, 'id' | 'createdAt' | 'updatedAt'> & { createdAt?: Date | Timestamp | null; updatedAt?: Date | Timestamp | null }): Promise<ReceiptStagingItem> {
  const { auth } = getFirebaseServices();
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('User must be logged in.');

  const db = getDb();
  const orgId = await getCurrentOrgId();
  const now = new Date();
  const payload = {
    ...data,
    orgId,
    userId: currentUser.uid,
    createdAt: data.createdAt ?? now,
    updatedAt: data.updatedAt ?? now,
    status: data.status ?? 'queued',
  };

  const ref = await addDoc(collection(db, RECEIPT_QUEUE_COLLECTION), payload);
  return { id: ref.id, ...payload } as ReceiptStagingItem;
}

export async function updateReceiptQueueItem(id: string, data: Partial<ReceiptStagingItem>): Promise<void> {
  const db = getDb();
  const ref = doc(db, RECEIPT_QUEUE_COLLECTION, id);
  await updateDoc(ref, {
    ...data,
    updatedAt: new Date(),
  });
}

export function buildSampleReceiptQueueItem(): Omit<ReceiptStagingItem, 'id'> {
  const now = new Date();
  const dateString = now.toISOString().slice(0, 10);

  return {
    orgId: '',
    userId: '',
    status: 'queued',
    sourceType: 'phone_scan',
    driveFileId: 'sample-receipt-1',
    driveFileName: 'sample-receipt.pdf',
    driveFolderPath: 'Ogeemo_Unprocessed_Receipts',
    documentUrl: 'https://example.com/receipt.pdf',
    extractedRawJson: {
      merchant_name: 'Acme Office Supply Co.',
      transaction_date: dateString,
      total_amount: 184.25,
      net_amount: 160.25,
      tax_amount: 24.00,
      currency: 'CAD',
    },
    merchantName: 'Acme Office Supply Co.',
    transactionDate: dateString,
    netAmount: 160.25,
    taxAmount: 24.00,
    totalAmount: 184.25,
    currency: 'CAD',
    confidenceScore: 0.92,
    proposedLedgerType: 'expense',
    proposedCategory: 'Office Supplies',
    proposedCompany: 'Acme Office Supply Co.',
    proposedDescription: 'Office supplies for client support work',
    businessReason: 'Required for office operations and client support tasks.',
    auditReferenceId: `REC-${Date.now()}`,
    reviewedBy: '',
  };
}

export async function seedSampleReceiptQueueItem(): Promise<ReceiptStagingItem> {
  const sample = buildSampleReceiptQueueItem();
  return addReceiptQueueItem(sample);
}

export async function syncReceiptQueueFromDrive(): Promise<ReceiptStagingItem[]> {
  const { getReceiptsFolderPdfs } = await import('@/services/google-service');
  const { extractInvoiceData } = await import('@/app/actions/ocr-actions');

  const result = await getReceiptsFolderPdfs();
  if (result.error) {
    throw new Error(result.error);
  }

  const existingItems = await getReceiptQueueItems();
  const existingIds = new Set(existingItems.map((item) => item.driveFileId || item.driveFileName || ''));
  const createdItems: ReceiptStagingItem[] = [];

  for (const file of result.files) {
    if (!file.id || existingIds.has(file.id)) {
      continue;
    }

    const extraction = await extractInvoiceData(file.id, true);
    const extracted = extraction.data;
    const displayName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');

    const item = {
      status: 'queued' as const,
      sourceType: 'desktop_scan' as const,
      driveFileId: file.id,
      driveFileName: file.name,
      driveFolderPath: 'Ogeemo_Unprocessed_Receipts',
      documentUrl: `https://drive.google.com/file/d/${file.id}/view`,
      extractedRawJson: extracted ?? {
        merchant_name: displayName,
        transaction_date: new Date().toISOString().slice(0, 10),
        total_amount: 0,
        net_amount: 0,
        tax_amount: 0,
        currency: 'CAD',
      },
      merchantName: extracted?.vendor_name || displayName,
      transactionDate: extracted?.date || new Date().toISOString().slice(0, 10),
      netAmount: Number(extracted?.subtotal ?? 0),
      taxAmount: Number(extracted?.tax ?? 0),
      totalAmount: Number(extracted?.total_amount ?? 0),
      currency: extracted?.currency || 'CAD',
      confidenceScore: 0.85,
      proposedLedgerType: 'expense' as const,
      proposedCategory: 'General Operating Expenses',
      proposedCompany: extracted?.vendor_name || displayName,
      proposedDescription: 'Queued from Google Drive intake for OCR review and approval.',
      businessReason: 'Awaiting OCR validation and business purpose review.',
      auditReferenceId: `REC-${Date.now()}-${file.id.slice(0, 6)}`,
      reviewedBy: '',
    } satisfies Omit<ReceiptStagingItem, 'id' | 'createdAt' | 'updatedAt'>;

    const created = await addReceiptQueueItem(item);
    createdItems.push(created);
  }

  return createdItems;
}

export async function postReceiptToLedger(itemId: string, reviewData: Partial<ReceiptStagingItem>): Promise<{ ledgerId: string; collection: string }> {
  const db = getDb();
  const itemRef = doc(db, RECEIPT_QUEUE_COLLECTION, itemId);
  const itemSnap = await getDoc(itemRef);
  if (!itemSnap.exists()) throw new Error('Receipt queue item not found.');

  const item = docToReceiptQueueItem(itemSnap);
  const merged = { ...item, ...reviewData };
  const auditReferenceId = merged.auditReferenceId || `REC-${Date.now()}-${itemId.slice(0, 6)}`;
  const vendorName = merged.proposedCompany || merged.merchantName || 'Unspecified Vendor';
  const description = merged.proposedDescription || `Receipt for ${vendorName}`;
  const date = merged.transactionDate || new Date().toISOString().slice(0, 10);
  const totalAmount = Number(merged.totalAmount ?? 0);
  const preTaxAmount = Number(merged.netAmount ?? totalAmount);
  const taxAmount = Number(merged.taxAmount ?? Math.max(totalAmount - preTaxAmount, 0));

  let ledgerId = '';
  let collectionName = 'expenseTransactions';

  if (merged.proposedLedgerType === 'payable_bill') {
    const bill = {
      vendor: vendorName,
      invoiceNumber: auditReferenceId,
      dueDate: date,
      totalAmount,
      preTaxAmount,
      taxAmount,
      taxRate: preTaxAmount ? (taxAmount / preTaxAmount) * 100 : 0,
      taxType: 'GST',
      category: merged.proposedCategory || 'General Operating Expenses',
      description,
      documentUrl: merged.documentUrl || '',
      userId: merged.userId || getCurrentAuthContext().uid,
      orgId: merged.orgId,
    } as any;

    const created = await addPayableBill(bill);
    ledgerId = created.id;
    collectionName = 'payableBills';
  } else {
    const expense = {
      date,
      company: vendorName,
      description,
      totalAmount,
      preTaxAmount,
      taxAmount,
      category: merged.proposedCategory || 'General Operating Expenses',
      paidFrom: 'Cash / Default',
      type: 'business',
      documentNumber: auditReferenceId,
      documentUrl: merged.documentUrl || '',
      explanation: merged.businessReason || 'Imported from receipt OCR review.',
      userId: merged.userId || getCurrentAuthContext().uid,
      orgId: merged.orgId,
    } as any;

    const created = await addExpenseTransaction(expense);
    ledgerId = created.id;
    collectionName = 'expenseTransactions';
  }

  await updateReceiptQueueItem(itemId, {
    status: 'posted',
    auditReferenceId,
    businessReason: merged.businessReason,
    company: vendorName,
    proposedCompany: vendorName,
    proposedDescription: description,
    postedAt: new Date(),
    postedLedgerId: ledgerId,
    postedLedgerCollection: collectionName,
  } as Partial<ReceiptStagingItem>);

  return { ledgerId, collection: collectionName };
}
