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

/**
 * Records a message submitted via the public contact form.
 */
export function submitInquiry(data: Omit<ContactInquiry, 'createdAt'>) {
  const { db } = getFirebaseServices();
  const inquiryData = {
    ...data,
    createdAt: new Date().toISOString(),
  };
  
  const collectionRef = collection(db, 'inquiries');

  // Mutation is non-blocking to leverage optimistic UI and background synchronization.
  addDoc(collectionRef, inquiryData)
    .catch(async (serverError) => {
      // Construct a detailed, contextual error for the developer overlay.
      const permissionError = new FirestorePermissionError({
        path: collectionRef.path,
        operation: 'create',
        requestResourceData: inquiryData,
      } satisfies SecurityRuleContext);

      // Emit the error centrally so the listener can trigger the dev overlay.
      errorEmitter.emit('permission-error', permissionError);
    });
}
