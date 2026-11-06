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
import { addExpenseTransaction, addIncomeTransaction, addPayableBill } from '@/core/accounting-service';
import { claimDocumentNumber } from '@/app/actions/numbering-actions';
import { fetchWithSession, withServerSession } from '@/lib/server-session';
import { isVisibleReceiptQueueItem } from '@/lib/receipt-queue-utils';
import { receiptFileUrl } from '@/lib/receipt-storage-utils';
import { RECEIPT_OCR_MODEL_NAME } from '@/lib/receipt-file-utils';
import { ocrResultToItemFields } from '@/lib/receipt-ocr-fields';
import { resolveOcrTax } from '@/lib/receipt-tax';
import type { ReceiptOcrSettings } from '@/lib/receipt-ocr-options';
import type { ExtractionResult } from '@/app/actions/ocr-actions';

export type ReceiptLedgerType = 'expense' | 'payable_bill' | 'income';

export interface ReceiptStagingItem {
  id: string;
  orgId?: string;
  userId?: string;
  /** Legacy marker from the retired sample workflow; used only to hide old samples. */
  isDemo?: boolean;
  createdAt?: Date | Timestamp | null;
  updatedAt?: Date | Timestamp | null;
  status: 'queued' | 'processing' | 'reviewed' | 'posted' | 'rejected';
  sourceType: 'phone_scan' | 'desktop_scan' | 'uploaded_pdf';
  /** Legacy bundled-sample identifier; such records are hidden from the queue. */
  demoReceiptId?: string;
  importedFrom?: 'google_drive' | 'local_file';
  fileHash?: string;
  fileSize?: number;
  sourceMimeType?: string;
  fileName?: string;
  driveFileId?: string;
  driveFileName?: string;
  driveFolderPath?: string;
  documentUrl?: string;
  /** Where the paper original is filed (Simple mode), for example "Box 3, 2026". */
  paperLocation?: string;
  /** Record-keeping mode in force when the receipt was added; never rewritten later. */
  recordKeepingMode?: 'simple' | 'audit' | 'custom';
  /** Private workspace storage path of the permanent copy (receipts/{orgId}/{id}/...). */
  storagePath?: string;
  storedAt?: Date | Timestamp | null;
  storedBy?: string;
  extractedRawJson?: Record<string, unknown>;
  ocrStatus?: 'completed' | 'failed';
  ocrError?: string | null;
  ocrEngine?: string;
  merchantName?: string;
  vendorDocumentNumber?: string;
  transactionDate?: string;
  netAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
  /** Tax type chosen for this receipt (id from Settings, or the manual marker) and what it stands for. */
  taxChoiceId?: string;
  taxType?: string;
  taxRate?: number;
  /** Tax exactly as printed on the receipt, kept only to compare with the calculated tax. */
  printedTaxAmount?: number;
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
    .filter(isVisibleReceiptQueueItem)
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt.toString()).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt.toString()).getTime() : 0;
      return bTime - aTime;
    });
}

/**
 * Every receipt in the workspace, including posted and removed ones, newest first.
 * Powers the Receipt Archive; the review queue uses getReceiptQueueItems() instead.
 */
export async function getAllReceiptsForArchive(): Promise<ReceiptStagingItem[]> {
  const db = getDb();
  const orgId = await getCurrentOrgId();
  const snap = await getDocs(query(collection(db, RECEIPT_QUEUE_COLLECTION), where('orgId', '==', orgId)));
  return snap.docs
    .map(docToReceiptQueueItem)
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

/**
 * Discards a receipt from the review queue.
 *
 * Deliberately a soft delete (status -> 'rejected'): a Drive-sourced receipt's
 * source file still lives in the unprocessed Drive folder, so hard-deleting
 * the queue doc would let the next sync silently re-import it. Rejected items
 * are hidden from the queue and skipped by sync dedupe forever. The source
 * file in Google Drive is never touched.
 */
export async function deleteReceiptQueueItem(id: string): Promise<void> {
  const db = getDb();
  const orgId = await getCurrentOrgId();
  const ref = doc(db, RECEIPT_QUEUE_COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  if (snap.data()?.orgId !== orgId) {
    throw new Error('This receipt belongs to a different workspace.');
  }
  await updateDoc(ref, {
    status: 'rejected',
    updatedAt: new Date(),
  });
}

interface ReceiptFileImport {
  fileName: string;
  mimeType: string;
  fileSize: number;
  /** SHA-256 hex of the original bytes. */
  fileHash: string;
}

export type LocalReceiptImport = ReceiptFileImport;

export type ReceiptImportResult =
  | { status: 'created'; item: ReceiptStagingItem }
  | { status: 'duplicate'; existing: ReceiptStagingItem };

/** Workspace defaults (Settings > Receipt OCR Rules) applied to every new receipt. */
export interface ReceiptIntakeDefaults {
  ledgerType: ReceiptLedgerType;
  category: string;
  /** Mode in force now; stamped on the receipt so later setting changes never rewrite its history. */
  recordKeepingMode?: 'simple' | 'audit' | 'custom';
}

/**
 * Adds a local file to the queue without running OCR.
 *
 * The Ogeemo document number is claimed from the shared REC counter (the same
 * one income receipts use) so it can never collide with another receipt. Call
 * storeReceiptFile() afterwards to keep the file permanently.
 */
export async function importLocalReceiptToQueue(
  input: LocalReceiptImport,
  defaults: ReceiptIntakeDefaults = { ledgerType: 'expense', category: '' }
): Promise<ReceiptImportResult> {
  const db = getDb();
  const orgId = await getCurrentOrgId();
  const rawSnap = await getDocs(query(collection(db, RECEIPT_QUEUE_COLLECTION), where('orgId', '==', orgId)));
  const allItems = rawSnap.docs.map(docToReceiptQueueItem);
  const duplicate = allItems.find((item) => item.status !== 'rejected' && item.fileHash === input.fileHash);
  if (duplicate) return { status: 'duplicate', existing: duplicate };

  const auditReferenceId = await withServerSession(() => claimDocumentNumber('REC'));

  const item = {
    importedFrom: 'local_file' as const,
    status: 'queued' as const,
    sourceType: 'uploaded_pdf' as const,
    fileName: input.fileName,
    fileHash: input.fileHash,
    fileSize: input.fileSize,
    sourceMimeType: input.mimeType,
    ...(defaults.recordKeepingMode ? { recordKeepingMode: defaults.recordKeepingMode } : {}),
    proposedLedgerType: defaults.ledgerType,
    proposedCategory: defaults.category,
    proposedDescription: 'Ready for OCR. Select this receipt in the queue and choose OCR Selected or OCR All.',
    businessReason: '',
    auditReferenceId,
    reviewedBy: '',
  } satisfies Omit<ReceiptStagingItem, 'id' | 'createdAt' | 'updatedAt'>;

  const created = await addReceiptQueueItem(item);
  return { status: 'created', item: created };
}

/**
 * Uploads the receipt file to private workspace storage and records where it
 * is on the queue item. Returns the storage path. Throws a readable error on failure.
 */
export async function storeReceiptFile(receiptId: string, bytes: Uint8Array): Promise<string> {
  const body = new Uint8Array(bytes).buffer;
  const response = await fetchWithSession(`/api/receipts/files?receiptId=${encodeURIComponent(receiptId)}`, {
    method: 'PUT',
    body,
  });
  const result = (await response.json().catch(() => ({}))) as { storagePath?: string; error?: string };
  if (!response.ok || !result.storagePath) {
    throw new Error(result.error || `The receipt could not be stored (${response.status}).`);
  }
  return result.storagePath;
}

/**
 * Downloads a receipt's permanent stored copy so OCR can read it without the user
 * choosing the original file again. Throws a readable error when it cannot be loaded.
 */
export async function fetchStoredReceiptFile(receiptId: string): Promise<{ bytes: Uint8Array; mimeType: string }> {
  const response = await fetchWithSession(receiptFileUrl(receiptId), { cache: 'no-store' });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `The stored receipt could not be loaded (${response.status}).`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const mimeType = response.headers.get('Content-Type') || 'application/octet-stream';
  return { bytes, mimeType };
}

/** Persists one explicit OCR result and returns the fields needed to update the UI. */
export async function saveReceiptOcrResult(
  itemId: string,
  extraction: ExtractionResult,
  current?: Pick<ReceiptStagingItem, 'proposedCategory' | 'proposedLedgerType' | 'taxChoiceId' | 'taxRate'>,
  taxSettings?: Pick<ReceiptOcrSettings, 'taxCalculation' | 'taxChoices' | 'defaultTaxChoice'>
): Promise<Partial<ReceiptStagingItem>> {
  const mapped = ocrResultToItemFields(extraction);
  // A failed retry must not erase values a reviewer may already have entered.
  const ocrFields: Record<string, unknown> = extraction.data ? { ...mapped } : {
    extractedRawJson: mapped.extractedRawJson,
    ocrStatus: mapped.ocrStatus,
    ocrError: mapped.ocrError,
  };

  // "Calculate from the total": keep only the total from OCR. The tax OCR read is stored as the
  // printed tax for comparison, and net and tax come from the chosen tax type (or stay empty
  // until the reviewer chooses one).
  if (extraction.data && taxSettings) {
    const tax = resolveOcrTax(taxSettings as ReceiptOcrSettings, extraction.data, {
      currentChoiceId: current?.taxChoiceId,
      currentRate: current?.taxRate,
      suggestedChoiceId: extraction.suggested?.taxChoice,
    });
    if (tax.dropOcrNetAndTax) {
      delete ocrFields.netAmount;
      delete ocrFields.taxAmount;
    }
    Object.assign(ocrFields, tax.fields);
  }

  const definedFields = Object.fromEntries(
    Object.entries(ocrFields).filter(([, value]) => value !== undefined)
  ) as Partial<ReceiptStagingItem>;

  // Vendor rules (Settings) fill the category only while it is still empty, so a
  // value the reviewer chose is never overwritten; they may always set the ledger type.
  const suggested = extraction.data ? extraction.suggested : undefined;
  const suggestions: Partial<ReceiptStagingItem> = {
    ...(suggested?.category && !(current?.proposedCategory ?? '').trim() ? { proposedCategory: suggested.category } : {}),
    ...(suggested?.ledgerType ? { proposedLedgerType: suggested.ledgerType } : {}),
  };

  const updates: Partial<ReceiptStagingItem> = {
    ...definedFields,
    ...suggestions,
    status: 'queued',
    ocrEngine: extraction.model || RECEIPT_OCR_MODEL_NAME,
    proposedDescription: extraction.data
      ? 'Fields extracted by OCR; verify them against the source document.'
      : 'OCR failed. Review the source document, enter the fields manually, or retry OCR.',
  };

  await updateReceiptQueueItem(itemId, updates);
  return updates;
}

export interface PostReceiptOptions {
  /** When true (Audit-ready, or Custom with the switch on), a stored scan is mandatory. */
  requireScan?: boolean;
}

export async function postReceiptToLedger(
  itemId: string,
  reviewData: Partial<ReceiptStagingItem>,
  options: PostReceiptOptions = {}
): Promise<{ ledgerId: string; collection: string }> {
  const db = getDb();
  const itemRef = doc(db, RECEIPT_QUEUE_COLLECTION, itemId);
  const itemSnap = await getDoc(itemRef);
  if (!itemSnap.exists()) throw new Error('Receipt queue item not found.');

  const item = docToReceiptQueueItem(itemSnap);
  if (item.status === 'posted') throw new Error('This receipt has already been posted to the ledger.');
  if (options.requireScan && !item.storagePath) {
    throw new Error('This receipt has no stored scan. Use Open File to add the original again before posting.');
  }

  const merged = { ...item, ...reviewData };
  const auditReferenceId = item.auditReferenceId || merged.auditReferenceId || '';
  if (!auditReferenceId) throw new Error('This receipt has no Ogeemo document number.');

  // With a stored scan, the ledger entry links to that permanent copy (never to a
  // temporary browser URL) so clicking its document number opens the scan. Without
  // one (scan switched off, or never stored) the entry still carries the REC number
  // to match the paper receipt, and records where the paper is filed.
  const hasScan = Boolean(item.storagePath);
  const sourceDocumentUrl = hasScan ? receiptFileUrl(itemId) : '';
  const receiptLink = hasScan
    ? { receiptId: itemId, receiptStoragePath: item.storagePath }
    : { ...(item.paperLocation ? { paperReceiptLocation: item.paperLocation } : {}) };
  const vendorName = merged.proposedCompany || merged.merchantName || 'Unspecified Vendor';
  const description = merged.proposedDescription || `Receipt for ${vendorName}`;
  const date = merged.transactionDate || new Date().toISOString().slice(0, 10);
  const totalAmount = Number(merged.totalAmount ?? 0);
  const preTaxAmount = Number(merged.netAmount ?? totalAmount);
  const taxAmount = Number(merged.taxAmount ?? Math.max(totalAmount - preTaxAmount, 0));
  // The chosen tax type and rate travel with the ledger entry (the printed tax is not recorded there).
  const taxLabel = merged.taxType || '';
  const taxRatePercent = typeof merged.taxRate === 'number' ? merged.taxRate : preTaxAmount ? (taxAmount / preTaxAmount) * 100 : 0;
  const taxDetails = {
    ...(taxLabel ? { taxType: taxLabel } : {}),
    taxRate: Math.round(taxRatePercent * 1000) / 1000,
  };

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
      ...taxDetails,
      taxType: taxLabel || 'GST',
      category: merged.proposedCategory || 'General Operating Expenses',
      description,
      documentUrl: sourceDocumentUrl,
      ...receiptLink,
      userId: merged.userId || getCurrentAuthContext().uid,
      orgId: merged.orgId,
    } as any;

    const created = await addPayableBill(bill);
    ledgerId = created.id;
    collectionName = 'payableBills';
  } else if (merged.proposedLedgerType === 'income') {
    const income = {
      date,
      company: vendorName,
      description,
      totalAmount,
      preTaxAmount,
      taxAmount,
      ...taxDetails,
      incomeCategory: merged.proposedCategory || 'Other Income',
      depositedTo: 'Cash / Default',
      type: 'business',
      documentNumber: auditReferenceId,
      documentUrl: sourceDocumentUrl,
      ...receiptLink,
      explanation: merged.businessReason || 'Imported from receipt OCR review.',
      userId: merged.userId || getCurrentAuthContext().uid,
      orgId: merged.orgId,
    } as any;

    const created = await addIncomeTransaction(income);
    ledgerId = created.id;
    collectionName = 'incomeTransactions';
  } else {
    const expense = {
      date,
      company: vendorName,
      description,
      totalAmount,
      preTaxAmount,
      taxAmount,
      ...taxDetails,
      category: merged.proposedCategory || 'General Operating Expenses',
      paidFrom: 'Cash / Default',
      type: 'business',
      documentNumber: auditReferenceId,
      documentUrl: sourceDocumentUrl,
      ...receiptLink,
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
