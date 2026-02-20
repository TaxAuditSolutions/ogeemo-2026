
'use client';

import { collection, addDoc } from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';

export interface ContactInquiry {
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
}

export async function submitInquiry(data: Omit<ContactInquiry, 'createdAt'>) {
  const { db } = getFirebaseServices();
  const inquiryData = {
    ...data,
    createdAt: new Date().toISOString(),
  };
  return await addDoc(collection(db, 'inquiries'), inquiryData);
}
