'use server';

import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/core/firebase-admin';
import { sendFormNotification } from '@/core/email-service';

export async function sendConnectionSignal(data: {
    firstName: string;
    lastName: string;
    email: string;
    subject: string;
    message: string;
}) {
    try {
        // Server actions must use the Admin SDK: the client SDK's
        // getFirebaseServices() cannot be invoked from the server.
        const db = getAdminDb();
        if (!db) {
            throw new Error('Database is not available. Please try again later.');
        }

        const inquiryRef = await db.collection('inquiries').add({
            ...data,
            type: 'contact',
            targetEmail: 'dan@ogeemo.com',
            status: 'new',
            notified: false,
            createdAt: FieldValue.serverTimestamp(),
        });

        const result = await sendFormNotification({
            formName: 'Contact Form',
            heading: `New Connection Signal — ${data.firstName} ${data.lastName}`.trim(),
            fields: [
                { label: 'Name', value: `${data.firstName} ${data.lastName}`.trim() },
                { label: 'Email', value: data.email },
                { label: 'Subject', value: data.subject },
                { label: 'Message', value: data.message },
            ],
            replyTo: data.email,
        });

        await inquiryRef.update({
            notified: result.sent,
            notifiedAt: FieldValue.serverTimestamp(),
            notifyError: result.error || null,
        });

        return { success: true, notified: result.sent };
    } catch (error: any) {
        console.error("Failed to save inquiry:", error);
        return { success: false, error: error.message };
    }
}
