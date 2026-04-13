
'use client';

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getFunctions, type Functions } from 'firebase/functions';
import firebaseConfig from '@/lib/config';

interface FirebaseServices {
  app: FirebaseApp;
  db: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
  functions: Functions;
}

let services: FirebaseServices | null = null;

/**
 * Initializes and returns Firebase client services.
 * Implements the singleton pattern to ensure one instance across the client.
 */
export function getFirebaseServices(): FirebaseServices {
  if (services) {
    return services;
  }

  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  const db = getFirestore(app);
  const auth = getAuth(app);
  const storage = getStorage(app);
  const functions = getFunctions(app);

  services = { app, db, auth, storage, functions };
  
  return services;
}

/**
 * Prompt-compliant initialization function.
 * Ensures the default app is initialized if it hasn't been already.
 */
export function initializeFirebase() {
    if (getApps().length === 0) {
        initializeApp(firebaseConfig);
    }
}

export { getFirestore, getAuth, getStorage, getFunctions };
    
