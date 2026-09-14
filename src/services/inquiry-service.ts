'use client';

import {
  collection,
  doc,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';

export interface InquiryRecord {
  id: string;
  /** Which form produced this inquiry: 'contact' | 'partnership'. */
  type: string;
  /** 'new' | 'read' */
  status: string;
  /** Whether the team notification email was sent for this submission. */
  notified?: boolean;
  notifiedAt?: unknown;
  notifyError?: string | null;
  email?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  company?: string;
  focus?: string;
  website?: string;
  subject?: string;
  message?: string;
  targetEmail?: string;
  createdAt: Date | null;
}

const INQUIRIES_COLLECTION = 'inquiries';

function docToInquiry(snap: any): InquiryRecord {
  const data = snap.data() || {};
  let createdAt: Date | null = null;
  const raw = data.createdAt;
  if (raw && typeof raw.toDate === 'function') {
    createdAt = raw.toDate();
  } else if (typeof raw === 'string') {
    const parsed = new Date(raw);
    createdAt = isNaN(parsed.getTime()) ? null : parsed;
  } else if (raw && typeof raw.seconds === 'number') {
    createdAt = new Date(raw.seconds * 1000);
  }
  return { id: snap.id, ...data, createdAt } as InquiryRecord;
}

/**
 * Lists all inquiries (contact + partnership submissions) for the admin
 * Inquiries inbox. Sorted newest-first. Sorting happens client-side so a
 * single-collection query works no matter how createdAt was stored
 * (serverTimestamp vs ISO string from older submissions).
 */
export async function getInquiries(): Promise<InquiryRecord[]> {
  const { db } = getFirebaseServices();
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  const snapshot = await getDocs(collection(db, INQUIRIES_COLLECTION));
  return snapshot.docs
    .map(docToInquiry)
    .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
}

/** Marks an inquiry as read (or back to new). */
export async function setInquiryStatus(inquiryId: string, status: 'new' | 'read'): Promise<void> {
  const { db } = getFirebaseServices();
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  await updateDoc(doc(db, INQUIRIES_COLLECTION, inquiryId), { status });
}
