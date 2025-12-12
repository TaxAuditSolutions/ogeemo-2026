
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getFunctions, type Functions } from "firebase/functions";

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

// This promise will be resolved with the initialized services, acting as a singleton.
let firebaseServicesPromise: Promise<FirebaseServices> | null = null;

export function initializeFirebase(): Promise<FirebaseServices> {
    if (firebaseServicesPromise) {
        return firebaseServicesPromise;
    }

    firebaseServicesPromise = (async () => {
        if (typeof window === 'undefined') {
            // This error should not be hit in a client-side context, but it's a good safeguard.
            throw new Error("Firebase client SDK can only be initialized in the browser.");
        }

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
        
        try {
            await setPersistence(auth, browserLocalPersistence);
        } catch (error) {
            console.error("Firebase persistence error:", error);
        }

        return { app, auth, db, storage, functions };
    })();
    
    return firebaseServicesPromise;
}
