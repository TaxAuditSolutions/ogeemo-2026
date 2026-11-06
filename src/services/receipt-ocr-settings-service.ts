'use client';

import { arrayUnion, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';
import { getOrganization, updateOrganizationDetails } from '@/core/organization-service';
import { normalizeReceiptOcrSettings } from '@/lib/receipt-ocr-settings';
import type { ReceiptOcrSettings } from '@/lib/receipt-ocr-options';
import { buildRecordKeepingLogEntry, type RecordKeepingLogEntry } from '@/lib/receipt-settings-log';

/**
 * Client access to the workspace's receipt OCR rules, which live on the
 * organization document. Reads are available to every member; Firestore rules
 * restrict writes to workspace administrators.
 */

const ORGANIZATIONS_COLLECTION = 'organizations';
const MAX_LOG_ENTRIES_RETURNED = 20;

export async function loadReceiptOcrSettingsForOrg(orgId: string): Promise<ReceiptOcrSettings> {
  const org = await getOrganization(orgId);
  return normalizeReceiptOcrSettings(org?.receiptOcrSettings);
}

/** Most recent record-keeping changes first. */
export async function loadRecordKeepingLog(orgId: string): Promise<RecordKeepingLogEntry[]> {
  const { db } = getFirebaseServices();
  const snap = await getDoc(doc(db, ORGANIZATIONS_COLLECTION, orgId));
  const log = snap.data()?.receiptRecordKeepingLog;
  if (!Array.isArray(log)) return [];
  return (log as RecordKeepingLogEntry[]).slice(-MAX_LOG_ENTRIES_RETURNED).reverse();
}

/**
 * Validates, saves and returns the cleaned rules. When a record-keeping control
 * changed, an entry (who, when, what) is appended to the workspace's change log.
 */
export async function saveReceiptOcrSettingsForOrg(
  orgId: string,
  settings: ReceiptOcrSettings,
  who: { userId: string; name?: string }
): Promise<ReceiptOcrSettings> {
  const cleaned = normalizeReceiptOcrSettings(settings);
  const previous = await loadReceiptOcrSettingsForOrg(orgId);
  await updateOrganizationDetails(orgId, { receiptOcrSettings: cleaned });

  const entry = buildRecordKeepingLogEntry(previous, cleaned, who);
  if (entry) {
    const { db } = getFirebaseServices();
    await updateDoc(doc(db, ORGANIZATIONS_COLLECTION, orgId), { receiptRecordKeepingLog: arrayUnion(entry) });
  }
  return cleaned;
}