'use client';

import { collection, addDoc } from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export interface ContactInquiry {
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
}

export function submitInquiry(data: Omit<ContactInquiry, 'createdAt'>) {
  const { db } = getFirebaseServices();
  const inquiryData = {
    ...data,
    createdAt: new Date().toISOString(),
  };
  
  const collectionRef = collection(db, 'inquiries');

  // Mutation is non-blocking to allow for optimistic UI updates
  addDoc(collectionRef, inquiryData)
    .catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: collectionRef.path,
        operation: 'create',
        requestResourceData: inquiryData,
      } satisfies SecurityRuleContext);

      errorEmitter.emit('permission-error', permissionError);
    });
}
