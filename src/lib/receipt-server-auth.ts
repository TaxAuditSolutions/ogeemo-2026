import { getCurrentSessionContext } from '@/app/actions';
import { getAdminDb } from '@/core/firebase-admin';
import { normalizeReceiptOcrSettings, type ReceiptOcrSettings } from '@/lib/receipt-ocr-settings';

/**
 * Server-only helpers for the receipt API routes: resolve the signed-in user's
 * workspace and role from the session cookie, and load that workspace's OCR rules.
 */

export interface ReceiptRequestContext {
  userId: string;
  orgId: string;
  canWrite: boolean;
}

/** Returns the caller's context, or null when not signed in or not in a workspace. */
export async function getReceiptRequestContext(): Promise<ReceiptRequestContext | null> {
  const session = await getCurrentSessionContext();
  if (!session?.userId || !session.orgId) return null;
  return {
    userId: session.userId,
    orgId: session.orgId,
    canWrite:
      session.accessLevel === 'editor' ||
      session.accessLevel === 'org_admin' ||
      session.accessLevel === 'super_admin',
  };
}

/** Loads the workspace's OCR rules, falling back to defaults when none are saved. */
export async function loadReceiptOcrSettings(orgId: string): Promise<ReceiptOcrSettings> {
  try {
    const db = getAdminDb();
    if (!db) return normalizeReceiptOcrSettings(undefined);
    const snap = await db.collection('organizations').doc(orgId).get();
    return normalizeReceiptOcrSettings(snap.data()?.receiptOcrSettings);
  } catch (error) {
    console.error('[Receipt OCR] Could not load workspace rules; using defaults.', error);
    return normalizeReceiptOcrSettings(undefined);
  }
}
