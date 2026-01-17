
'use client';

import type { User, Auth } from 'firebase/auth';
import { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { useFirebase } from '@/firebase/provider';
import LoadingModal from '@/components/ui/loading-modal';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  accessToken: string | null;
  auth: Auth | null; // Provide the auth object
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  getGoogleAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const publicPaths = ['/login', '/register'];
const marketingPaths = ['/home', '/for-small-businesses', '/for-accountants', '/news', '/about', '/contact', '/privacy', '/terms', '/explore'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const { auth } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  const pathname = usePathname();
  const router = useRouter();
  
  useEffect(() => {
    if (!auth) {
        setIsAuthLoading(true);
        return;
    };

    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        const token = sessionStorage.getItem('google_access_token');
        setAccessToken(token);
        const idToken = await currentUser.getIdToken();
        await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
        });
      } else {
        setAccessToken(null);
        sessionStorage.removeItem('google_access_token');
        await fetch('/api/auth/session', { method: 'DELETE' });
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);


  useEffect(() => {
    if (!isAuthLoading) {
      const isPublicPath = publicPaths.some(p => pathname.startsWith(p));
      const isMarketingPath = marketingPaths.some(p => pathname.startsWith(p)) || pathname === '/';
      
      // If the user is authenticated and on a public auth page, redirect them away.
      if (user && isPublicPath) {
        router.push('/action-manager');
      }

      // If the user is not authenticated and on a protected page, redirect them to login.
      if (!user && !isPublicPath && !isMarketingPath) {
        router.push('/login');
      }
    }
  }, [user, isAuthLoading, pathname, router]);
  
  const signInWithGoogle = useCallback(async () => {
    if (!auth) {
        throw new Error("Firebase is not initialized.");
    }
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file'); 
    provider.addScope('https://www.googleapis.com/auth/contacts.readonly');
    
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
        sessionStorage.setItem('google_access_token', credential.accessToken);
        setAccessToken(credential.accessToken);
    }
  }, [auth]);

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
    if (auth) {
      // Clear the server session, sign out of firebase, then clear local state and redirect.
      // This more imperative flow ensures all state is cleared before navigation.
      await fetch('/api/auth/session', { method: 'DELETE' });
      await signOut(auth);
      setUser(null);
      setAccessToken(null);
      sessionStorage.removeItem('google_access_token');
      router.push('/login');
    }
  }, [auth, router]);

  const value = { user, isLoading: isAuthLoading, accessToken, auth, logout, signInWithGoogle, getGoogleAccessToken };
  
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
