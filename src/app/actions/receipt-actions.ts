'use server';

import { getCurrentSessionContext } from '@/app/actions';
import { canWrite } from '@/lib/access-rules';
import { createRateLimiter } from '@/lib/ai-rate-limit';
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

// A receipt email goes to a client, so it needs a writer role (a viewer may only read) and is rate limited: a
// signed-in script could otherwise use it to send email to anyone from Ogeemo's address.
const receiptLimiter = createRateLimiter({ max: 20, windowMs: 60_000 });

async function requireSessionUid(): Promise<string> {
    const session = await getCurrentSessionContext();
    if (!session) throw new Error('Unauthorized: Please sign in again.');
    if (!canWrite(session.accessLevel)) throw new Error('Unauthorized: Your role cannot send receipts.');
    const limit = receiptLimiter.check(session.userId);
    if (!limit.ok) throw new Error(`Please wait ${limit.retryAfterSeconds} seconds before sending another receipt.`);
    return session.userId;
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