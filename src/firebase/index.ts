'use client';

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getFunctions, type Functions } from "firebase/functions";

// Re-export all the hooks and providers from other files
export * from './provider';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export type FirebaseServices = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
  functions: Functions;
};

let services: FirebaseServices | null = null;

function createServices(): FirebaseServices {
    const missingVars = Object.entries(firebaseConfig)
        .filter(([key, value]) => !value)
        .map(([key]) => `NEXT_PUBLIC_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`);

    if (missingVars.length > 0) {
        throw new Error(`Firebase configuration is incomplete. Missing environment variables: ${missingVars.join(", ")}`);
    }
    
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const auth = getAuth(app);
    const db = getFirestore(app);
    const storage = getStorage(app);
    const functions = getFunctions(app);
    
    // Set persistence asynchronously to avoid blocking initialization
    setPersistence(auth, browserLocalPersistence).catch((error) => {
        console.error("Firebase persistence error:", error);
    });

    return { app, auth, db, storage, functions };
}

export function getFirebaseServices(): FirebaseServices | null {
    if (typeof window === 'undefined') {
        return null;
    }

    if (!services) {
        services = createServices();
    }
    
    return services;
}

export function initializeFirebase(): Promise<FirebaseServices> {
    const s = getFirebaseServices();
    if (s) {
        return Promise.resolve(s);
    }
    return Promise.reject(new Error("Firebase client SDK can only be initialized in the browser."));
}
