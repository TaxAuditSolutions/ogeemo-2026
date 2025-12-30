
'use client';

import type { User } from 'firebase/auth';
import { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { useFirebase } from '@/firebase/provider'; // Updated import
import LoadingModal from '@/components/ui/loading-modal';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  accessToken: string | null;
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
    // The key change: only start listening for auth state once `auth` is available.
    if (!auth) {
        // If auth is not ready, we are still loading.
        // The FirebaseClientProvider is responsible for initializing it.
        setIsAuthLoading(true);
        return;
    };

    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        const token = sessionStorage.getItem('google_access_token');
        setAccessToken(token);
        const idToken = await currentUser.getIdToken();
        // Securely set the session cookie for server-side authentication
        await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
        });
      } else {
        // Clear session data on logout
        setAccessToken(null);
        sessionStorage.removeItem('google_access_token');
        await fetch('/api/auth/session', { method: 'DELETE' });
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, [auth]); // This effect now correctly depends on the `auth` object.


  useEffect(() => {
    if (!isAuthLoading) {
      const isPublicPath = publicPaths.some(p => pathname.startsWith(p));
      const isMarketingPath = marketingPaths.some(p => pathname.startsWith(p)) || pathname === '/';
      
      if (!user && !isPublicPath && !isMarketingPath) {
        router.push('/login');
      } else if (user && (isPublicPath || pathname === '/home' || pathname === '/')) {
        router.push('/action-manager');
      }
    }
  }, [user, isAuthLoading, pathname, router]);
  
  const signInWithGoogle = async () => {
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
  };

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
  }, []); // signInWithGoogle is stable due to being defined outside useEffect


  const logout = async () => {
    if (auth) {
      await signOut(auth);
    }
  };
  
  if (isAuthLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4"></div>
            <p className="font-semibold">Starting app...</p>
        </div>
      </div>
    );
  }

  const value = { user, isLoading: isAuthLoading, accessToken, logout, signInWithGoogle, getGoogleAccessToken };

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
