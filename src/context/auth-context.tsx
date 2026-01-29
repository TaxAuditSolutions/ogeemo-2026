'use client';

import type { User, Auth } from 'firebase/auth';
import { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { GoogleAuthProvider, signInWithPopup, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirebaseServices } from '@/firebase';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  accessToken: string | null;
  auth: Auth; 
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  getGoogleAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const publicPaths = ['/login', '/register'];
const marketingPaths = [
    '/website', 
    '/features',
    '/for-small-businesses', 
    '/for-accountants',
    '/for-bookkeepers',
    '/for-virtual-assistants',
    '/for-lawyers',
    '/for-paralegals',
    '/blog',
    '/about', 
    '/contact', 
    '/privacy', 
    '/terms'
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  const pathname = usePathname();
  const router = useRouter();
  
  const { auth: firebaseAuth } = getFirebaseServices();

  useEffect(() => {
    setPersistence(firebaseAuth, browserLocalPersistence).catch((error) => {
        console.error("Firebase persistence error:", error);
    });

    const unsubscribe = firebaseAuth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        const token = sessionStorage.getItem('google_access_token');
        setAccessToken(token);
        const idToken = await currentUser.getIdToken();
        
        // This creates the server-side session cookie. 
        // We catch errors to avoid blocking the UI if session creation is slow.
        try {
            await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
            });
        } catch (e) {
            console.error("Auth: Failed to synchronize session cookie.", e);
        }
      } else {
        // Clear everything on sign out
        setAccessToken(null);
        sessionStorage.removeItem('google_access_token');
        fetch('/api/auth/session', { method: 'DELETE' }).catch(() => {});
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, [firebaseAuth]);


  useEffect(() => {
    if (!isAuthLoading) {
      const isPublicPath = publicPaths.some(p => pathname.startsWith(p)) || pathname === '/login' || pathname === '/register';
      const isMarketingPath = marketingPaths.some(p => pathname.startsWith(p)) || pathname === '/';
      
      if (user && isPublicPath) {
        router.push('/action-manager');
      }

      if (!user && !isPublicPath && !isMarketingPath) {
        router.push('/login');
      }
    }
  }, [user, isAuthLoading, pathname, router]);
  
  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file'); 
    provider.addScope('https://www.googleapis.com/auth/contacts.readonly');
    
    const result = await signInWithPopup(firebaseAuth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
        sessionStorage.setItem('google_access_token', credential.accessToken);
        setAccessToken(credential.accessToken);
    }
  }, [firebaseAuth]);

  const getGoogleAccessToken = useCallback(async (): Promise<string | null> => {
    const storedToken = sessionStorage.getItem('google_access_token');
    if (storedToken) {
        return storedToken;
    }
    try {
        await signInWithGoogle();
        const newStoredToken = sessionStorage.getItem('google_access_token');
        return newStoredToken;
    } catch (error) {
        console.error("Failed to sign in to get Google Access Token", error);
        return null;
    }
  }, [signInWithGoogle]); 


  const logout = useCallback(async () => {
      await fetch('/api/auth/session', { method: 'DELETE' }).catch(() => {});
      await signOut(firebaseAuth);
      setUser(null);
      setAccessToken(null);
      sessionStorage.removeItem('google_access_token');
      router.push('/login');
  }, [router, firebaseAuth]);

  const value = { user, isLoading: isAuthLoading, accessToken, auth: firebaseAuth, logout, signInWithGoogle, getGoogleAccessToken };
  
  return (
    <AuthContext.Provider value={value}>
      {isAuthLoading ? (
        <div className="flex h-screen w-screen items-center justify-center">
          <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4"></div>
              <p className="font-semibold">Starting app...</p>
          </div>
        </div>
      ) : children}
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
