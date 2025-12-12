
'use client';

import type { User } from 'firebase/auth';
import { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { initializeFirebase, FirebaseServices } from '@/lib/firebase';
import { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  accessToken: string | null;
  firebaseServices: FirebaseServices | null;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  getGoogleAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const publicPaths = ['/login', '/register'];
const marketingPaths = ['/home', '/for-small-businesses', '/for-accountants', '/news', '/about', '/contact', '/privacy', '/terms', '/explore'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [firebaseServices, setFirebaseServices] = useState<FirebaseServices | null>(null);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  
  useEffect(() => {
    initializeFirebase()
      .then(services => {
        setFirebaseServices(services);
        const unsubscribe = onAuthStateChanged(services.auth, async (currentUser) => {
          setUser(currentUser);
          
          if (currentUser) {
            const token = sessionStorage.getItem('google_access_token');
            setAccessToken(token);
            const idToken = await currentUser.getIdToken();
            // Create session cookie on login
            await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
            });
          } else {
            setAccessToken(null);
            sessionStorage.removeItem('google_access_token');
            // Trigger server-side session deletion on logout
            await fetch('/api/auth/session', { method: 'DELETE' });
          }
          setIsLoading(false);
        });
        return unsubscribe;
      })
      .catch(err => {
        console.error("Firebase initialization failed:", err);
        setInitializationError(err.message);
        setIsLoading(false);
      });
  }, []);


  useEffect(() => {
    if (!isLoading) {
      const isPublicPath = publicPaths.includes(pathname);
      const isMarketingPath = marketingPaths.some(p => pathname.startsWith(p)) || pathname === '/';
      
      if (!user && !isPublicPath && !isMarketingPath) {
        router.push('/login');
      } else if (user && (isPublicPath || pathname === '/home' || pathname === '/')) {
        router.push('/action-manager');
      }
    }
  }, [user, isLoading, pathname, router]);
  
  const signInWithGoogle = async () => {
    if (!firebaseServices) {
        throw new Error("Firebase is not initialized.");
    }
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file'); 
    provider.addScope('https://www.googleapis.com/auth/contacts.readonly');
    
    const result = await signInWithPopup(firebaseServices.auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
        sessionStorage.setItem('google_access_token', credential.accessToken);
        setAccessToken(credential.accessToken);
    }
  };

  const getGoogleAccessToken = useCallback(async (): Promise<string | null> => {
    const storedToken = sessionStorage.getItem('google_access_token');
    if (storedToken) {
        return storedToken;
    }
    // If no token, trigger the sign-in process
    try {
        await signInWithGoogle();
        const newStoredToken = sessionStorage.getItem('google_access_token');
        return newStoredToken;
    } catch (error) {
        console.error("Failed to sign in to get Google Access Token", error);
        return null;
    }
  }, []);


  const logout = async () => {
    if (firebaseServices) {
      await signOut(firebaseServices.auth);
      // The onAuthStateChanged listener will handle the session cookie deletion
    }
  };
  
  if (initializationError) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-red-100 p-4 text-center text-red-800">
        <h1 className="mb-4 text-2xl font-bold">Firebase Initialization Error</h1>
        <p className="mb-2">{initializationError}</p>
        <p>Please check your Firebase configuration in your project's environment variables and ensure all required values are set correctly.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4"></div>
            <p className="font-semibold">Starting app...</p>
        </div>
      </div>
    );
  }

  const value = { user, isLoading, accessToken, firebaseServices, logout, signInWithGoogle, getGoogleAccessToken };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
