'use server';

import { cookies } from 'next/headers';
import { getAdminAuth } from '@/core/firebase-admin';
import {
    buildReceiptEmail,
    isEmailServiceConfigured,
    sendEmailMessage,
} from '@/core/email-service';

/**
 * Receipt email server action.
 *
 * The client resolves the recipient (contact email) and invoice details;
 * this action only authenticates the caller through the session cookie and
 * sends. Sending NEVER touches Firestore - a mail outage cannot affect
 * bookkeeping, and callers get { sent, error } instead of a thrown error.
 */

export interface SendReceiptEmailPayload {
    to: string;
    companyName: string;
    invoiceNumber: string;
    /** Latest payment receipt number (REC-...); legacy invoices may omit it. */
    receiptNumber?: string;
    /** Payment amount this receipt acknowledges. */
    amount: number;
    originalAmount?: number;
    amountPaid?: number;
    /** Payment date (ISO or yyyy-MM-dd). */
    paymentDate?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireSessionUid(): Promise<string> {
    const adminAuth = getAdminAuth();
    if (!adminAuth) throw new Error('Firebase Admin SDK is not initialized.');

    const sessionCookie = (await cookies()).get('session')?.value;
    if (!sessionCookie) throw new Error('Unauthorized: No session cookie found.');

    try {
        const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
        return decodedToken.uid as string;
    } catch {
        throw new Error('Unauthorized: Invalid session cookie.');
    }
}

/** Emails a payment receipt to the client. Returns { sent, error } - never throws for mail issues. */
export async function sendReceiptEmail(
    payload: SendReceiptEmailPayload
): Promise<{ sent: boolean; error?: string }> {
    await requireSessionUid();

    const to = (payload.to || '').trim();
    if (!EMAIL_PATTERN.test(to)) {
        return { sent: false, error: 'Enter a valid recipient email address.' };
    }
    if (!payload.companyName?.trim() || !payload.invoiceNumber?.trim()) {
        return { sent: false, error: 'Missing invoice details for the receipt email.' };
    }
    if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
        return { sent: false, error: 'Invalid payment amount for the receipt email.' };
    }
    if (!isEmailServiceConfigured()) {
        return { sent: false, error: 'Email is not configured in this environment.' };
    }

    return sendEmailMessage(buildReceiptEmail({ ...payload, to }));
}