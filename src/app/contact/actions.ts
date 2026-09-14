'use server';

import { getFirebaseServices } from '@/firebase';
import { collection, addDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { sendFormNotification } from '@/core/email-service';

export async function sendConnectionSignal(data: {
    firstName: string;
    lastName: string;
    email: string;
    subject: string;
    message: string;
}) {
    try {
        const { db } = getFirebaseServices();

        const inquiryRef = await addDoc(collection(db, 'inquiries'), {
            ...data,
            type: 'contact',
            targetEmail: 'dan@ogeemo.com',
            status: 'new',
            notified: false,
            createdAt: serverTimestamp(),
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

        await updateDoc(inquiryRef, {
            notified: result.sent,
            notifiedAt: serverTimestamp(),
            notifyError: result.error || null,
        });

        return { success: true, notified: result.sent };
    } catch (error: any) {
        console.error("Failed to save inquiry:", error);
        return { success: false, error: error.message };
    }
}
