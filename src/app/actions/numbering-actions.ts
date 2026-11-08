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
    numberIsTaken,
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

    // The browser sends its own calendar day. This code runs on the server, whose clock is usually UTC,
    // so without it an evening in Canada would already be numbered as tomorrow.
    const date = businessDate && isValidBusinessDate(businessDate) ? businessDate : formatBusinessDate();
    const config = await loadNumberingConfig(orgId);

    const entries = await Promise.all(DOCUMENT_NUMBER_TYPES.map(async (type) => {
        const rule = normalizeRule(config[type], DEFAULT_NUMBERING[type]);
        const counterSnap = await adminDb
            .collection('organizations')
            .doc(orgId)
            .collection('counters')
            .doc(counterDocId(type, date))
            .get();
        let next = ((counterSnap.data()?.value as number) || 0) + 1;
        let number = formatDocumentNumber(type, rule, date, next);
        // A claim skips numbers already used (for example after the counter was steered back), so the
        // preview skips them too and shows the number the save will really give.
        for (let attempt = 0; attempt < 10 && (await isNumberTaken(adminDb, type, number, orgId)); attempt++) {
            next += 1;
            number = formatDocumentNumber(type, rule, date, next);
        }
        return [type, number] as const;
    }));
    return Object.fromEntries(entries) as Record<DocumentNumberType, string>;
}

async function isNumberTaken(
    adminDb: NonNullable<ReturnType<typeof getAdminDb>>,
    type: DocumentNumberType,
    value: string,
    orgId: string,
    excludeDocId?: string
): Promise<boolean> {
    const field = NUMBERING_DOC_FIELDS[type];
    const primary = adminDb.collection(NUMBERING_COLLECTIONS[type]);

    // Every workspace numbers from 001 each day, so the same number exists in many workspaces. Ask for this
    // workspace's documents only: asking for all of them and keeping the first 10 could fill up with other
    // workspaces' documents and hide a real duplicate here.
    const scoped = await primary.where(field, '==', value).where('orgId', '==', orgId).limit(5).get();
    if (numberIsTaken(scoped.docs.map((doc) => ({ id: doc.id, orgId })), orgId, excludeDocId)) return true;

    // Documents saved before workspaces existed have no orgId and count as this workspace's.
    const everyone = await primary.where(field, '==', value).limit(50).get();
    const legacy = everyone.docs.filter((doc) => doc.data()?.orgId === undefined).map((doc) => ({ id: doc.id }));
    if (numberIsTaken(legacy, orgId, excludeDocId)) return true;
    if (type !== 'REC') return false;

    // REC numbers are shared by income receipts and scanned expense receipts, which
    // keep theirs in the receipt queue (auditReferenceId), so check there as well.
    const queueSnap = await adminDb
        .collection('receiptStagingQueue')
        .where('auditReferenceId', '==', value)
        .where('orgId', '==', orgId)
        .limit(5)
        .get();
    return queueSnap.docs.some((doc) => doc.id !== excludeDocId);
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
