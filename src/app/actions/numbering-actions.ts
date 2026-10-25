'use server';

import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/core/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
    DEFAULT_NUMBERING,
    DOCUMENT_NUMBER_TYPES,
    MAX_COUNTER_NEXT,
    MIN_COUNTER_NEXT,
    NUMBERING_COLLECTIONS,
    NUMBERING_DOC_FIELDS,
    counterDocId,
    counterValueForNext,
    formatBusinessDate,
    formatDocumentNumber,
    isDocumentNumberType,
    normalizeRule,
    isValidBusinessDate,
    isValidCounterNext,
    validateOverrideNumber,
    type DocumentNumberType,
    type NumberingConfig,
} from '@/core/document-numbering';

/**
 * Document-numbering server actions.
 *
 * The session cookie is re-minted after switchActiveOrg (see org-actions), so its
 * claims always carry the ACTIVE workspace — the same org resolveOrgId() resolves
 * on the client. Counters live at organizations/{orgId}/counters/{TYPE_YYYYMMDD}
 * and are only ever touched from here (admin SDK), so no client rules are needed.
 */

async function requireActiveOrg(): Promise<{ uid: string; orgId: string; accessLevel: string | null }> {
    const adminAuth = getAdminAuth();
    if (!adminAuth) throw new Error('Firebase Admin SDK is not initialized.');

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (!sessionCookie) throw new Error('Unauthorized: No session cookie found.');

    let decodedToken;
    try {
        decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    } catch {
        throw new Error('Unauthorized: Invalid session cookie.');
    }

    const orgId = decodedToken.orgId as string | undefined;
    if (!orgId) throw new Error('Unauthorized: Your session has no active workspace.');

    return {
        uid: decodedToken.uid as string,
        orgId,
        accessLevel: (decodedToken.accessLevel as string | null) ?? null,
    };
}

async function loadNumberingConfig(orgId: string): Promise<NumberingConfig> {
    const adminDb = getAdminDb();
    if (!adminDb) throw new Error('Firebase Admin SDK is not initialized.');
    const orgSnap = await adminDb.collection('organizations').doc(orgId).get();
    const numbering = orgSnap.data()?.numbering;
    return (numbering || {}) as NumberingConfig;
}

/** Next number for TODAY per type — powers form previews and the Settings card. */
export async function getNextDocumentNumbers(businessDate?: string): Promise<Record<DocumentNumberType, string>> {
    const { orgId } = await requireActiveOrg();
    const adminDb = getAdminDb();
    if (!adminDb) throw new Error('Firebase Admin SDK is not initialized.');

    const date = businessDate && isValidBusinessDate(businessDate) ? businessDate : formatBusinessDate();
    const config = await loadNumberingConfig(orgId);
    const out = {} as Record<DocumentNumberType, string>;

    for (const type of DOCUMENT_NUMBER_TYPES) {
        const rule = normalizeRule(config[type], DEFAULT_NUMBERING[type]);
        const counterSnap = await adminDb
            .collection('organizations')
            .doc(orgId)
            .collection('counters')
            .doc(counterDocId(type, date))
            .get();
        const next = ((counterSnap.data()?.value as number) || 0) + 1;
        out[type] = formatDocumentNumber(type, rule, date, next);
    }
    return out;
}

async function isNumberTaken(
    adminDb: NonNullable<ReturnType<typeof getAdminDb>>,
    type: DocumentNumberType,
    value: string,
    orgId: string,
    excludeDocId?: string
): Promise<boolean> {
    const snap = await adminDb
        .collection(NUMBERING_COLLECTIONS[type])
        .where(NUMBERING_DOC_FIELDS[type], '==', value)
        .limit(10)
        .get();

    return snap.docs.some((doc) => {
        if (doc.id === excludeDocId) return false;
        const docOrg = doc.data()?.orgId;
        // Legacy docs without an orgId are treated as same-tenant (payment ledger).
        return docOrg === undefined || docOrg === orgId;
    });
}

/**
 * Claims the next number for a document at SAVE time.
 *
 * - Auto path: increments today's per-type counter in a transaction, then verifies
 *   uniqueness (retries the sequence if an overridden number already occupies it).
 * - Override path (user edited the field): keeps the typed value, uniqueness-checks
 *   it within the org (excluding the doc being edited), and only consumes a counter
 *   slot when the typed value equals the current next number.
 *
 * Throws Error with a user-facing message on validation/uniqueness failure.
 */
export async function claimDocumentNumber(
    type: DocumentNumberType,
    opts?: { businessDate?: string; override?: string; excludeDocId?: string }
): Promise<string> {
    if (!isDocumentNumberType(type)) throw new Error(`Unknown document type "${type}".`);

    const { orgId } = await requireActiveOrg();
    const adminDb = getAdminDb();
    if (!adminDb) throw new Error('Firebase Admin SDK is not initialized.');

    const date = opts?.businessDate && isValidBusinessDate(opts.businessDate)
        ? opts.businessDate
        : formatBusinessDate();
    const config = await loadNumberingConfig(orgId);
    const rule = normalizeRule(config[type], DEFAULT_NUMBERING[type]);
    const counterRef = adminDb
        .collection('organizations')
        .doc(orgId)
        .collection('counters')
        .doc(counterDocId(type, date));

    if (opts?.override !== undefined) {
        const check = validateOverrideNumber(opts.override);
        if (!check.ok) throw new Error(check.error);

        if (await isNumberTaken(adminDb, type, check.value, orgId, opts.excludeDocId)) {
            throw new Error(`Number "${check.value}" is already in use. Choose a different number.`);
        }

        // Accepting the preview as-typed consumes the slot so later saves can't reuse it.
        const counterSnap = await counterRef.get();
        const nextValue = ((counterSnap.data()?.value as number) || 0) + 1;
        const nextNumber = formatDocumentNumber(type, rule, date, nextValue);
        if (nextNumber === check.value) {
            await adminDb.runTransaction(async (tx) => {
                const live = await tx.get(counterRef);
                const value = ((live.data()?.value as number) || 0) + 1;
                tx.set(
                    counterRef,
                    { value, type, businessDate: date, orgId, updatedAt: FieldValue.serverTimestamp() },
                    { merge: true }
                );
            });
        }
        return check.value;
    }

    // Auto path: increment, then verify-until-free (guards against future overrides).
    for (let attempt = 0; attempt < 10; attempt++) {
        const sequence = await adminDb.runTransaction(async (tx) => {
            const snap = await tx.get(counterRef);
            const value = ((snap.data()?.value as number) || 0) + 1;
            tx.set(
                counterRef,
                { value, type, businessDate: date, orgId, updatedAt: FieldValue.serverTimestamp() },
                { merge: true }
            );
            return value as number;
        });

        const number = formatDocumentNumber(type, rule, date, sequence);
        if (!(await isNumberTaken(adminDb, type, number, orgId, opts?.excludeDocId))) {
            return number;
        }
    }
    throw new Error('Could not reserve a free document number. Please try again.');
}

/**
 * Steers today's counter for a type so the NEXT auto-claimed number is
 * `nextValue` (1 -> PREFIX-YYYYMMDD-001, or to restart a drifted sequence).
 * Admin-only. Numbers already issued today are still skipped by the
 * uniqueness guard in claimDocumentNumber - this steers future claims;
 * it never reuses a taken number.
 */
export async function setDocumentCounter(
    type: DocumentNumberType,
    nextValue: number,
    opts?: { businessDate?: string }
): Promise<void> {
    if (!isDocumentNumberType(type)) throw new Error(`Unknown document type "${type}".`);
    if (!isValidCounterNext(nextValue)) {
        throw new Error(
            `Next number must be a whole number between ${MIN_COUNTER_NEXT} and ${MAX_COUNTER_NEXT}.`
        );
    }
    const { orgId, accessLevel } = await requireActiveOrg();
    if (accessLevel !== 'org_admin' && accessLevel !== 'super_admin') {
        throw new Error('Only workspace administrators can change document counters.');
    }

    const adminDb = getAdminDb();
    if (!adminDb) throw new Error('Firebase Admin SDK is not initialized.');
    const date = opts?.businessDate && isValidBusinessDate(opts.businessDate) ? opts.businessDate : formatBusinessDate();
    const counterRef = adminDb
        .collection('organizations')
        .doc(orgId)
        .collection('counters')
        .doc(counterDocId(type, date));

    const value = counterValueForNext(nextValue);
    await adminDb.runTransaction(async (tx) => {
        tx.set(
            counterRef,
            { value, type, businessDate: date, orgId, updatedAt: FieldValue.serverTimestamp() },
            { merge: true }
        );
    });
}
