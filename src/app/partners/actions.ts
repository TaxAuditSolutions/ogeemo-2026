'use server';

import { getFirebaseServices } from '@/firebase';
import { collection, addDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { sendFormNotification } from '@/core/email-service';

const MAX_FIELD_LENGTH = 5000;

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, MAX_FIELD_LENGTH) : '';
}

/**
 * Saves a partnership application from the public Partners page into the
 * `inquiries` collection (so it appears in the in-app Inquiries inbox) and
 * emails the team mailboxes (notifications@ogeemo.com + dan@ogeemo.com).
 */
export async function submitPartnershipApplication(data: {
  name: string;
  company: string;
  email: string;
  focus: string;
  website?: string;
  message: string;
}): Promise<{ success: boolean; notified?: boolean; error?: string }> {
  try {
    const name = clean(data.name);
    const company = clean(data.company);
    const email = clean(data.email);
    const focus = clean(data.focus);
    const website = clean(data.website);
    const message = clean(data.message);

    if (!name || !company || !email || !focus || !message) {
      return { success: false, error: 'Please fill in all required fields.' };
    }

    const { db } = getFirebaseServices();

    const inquiryRef = await addDoc(collection(db, 'inquiries'), {
      type: 'partnership',
      name,
      company,
      email,
      focus,
      website,
      message,
      targetEmail: 'dan@ogeemo.com',
      status: 'new',
      notified: false,
      createdAt: serverTimestamp(),
    });

    const result = await sendFormNotification({
      formName: 'Partnership Application',
      heading: `New Partnership Application — ${name} (${company})`,
      fields: [
        { label: 'Name', value: name },
        { label: 'Organization', value: company },
        { label: 'Email', value: email },
        { label: 'Partnership Focus', value: focus },
        { label: 'Website', value: website || 'Not provided' },
        { label: 'Message', value: message },
      ],
      replyTo: email,
    });

    await updateDoc(inquiryRef, {
      notified: result.sent,
      notifiedAt: serverTimestamp(),
      notifyError: result.error || null,
    });

    return { success: true, notified: result.sent };
  } catch (error: any) {
    console.error('Failed to save partnership application:', error);
    return { success: false, error: error.message };
  }
}