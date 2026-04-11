'use client';

import type { User, Auth } from 'firebase/auth';
import { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { GoogleAuthProvider, signInWithPopup, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirebaseServices } from '@/firebase';
import { getUserProfile, updateUserProfile } from '@/services/user-profile-service';

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
    '/for-consultants',
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
    // Hard fail-safe: if Firebase auth never responds, stop showing the loading screen
    // after 10 seconds and let the routing logic redirect to /login.
    const authTimeout = setTimeout(() => {
        setIsAuthLoading(false);
        console.warn("Auth: onAuthStateChanged did not fire within 10s. Forcing auth load complete.");
    }, 10000);

    setPersistence(firebaseAuth, browserLocalPersistence).catch((error: any) => {
        console.error("Firebase persistence error:", error);
    });

    const unsubscribe = firebaseAuth.onAuthStateChanged(async (currentUser: User | null) => {
      clearTimeout(authTimeout); // Auth responded — cancel the hard timeout
      setUser(currentUser);
      
      if (currentUser) {
        const token = sessionStorage.getItem('google_access_token');
        setAccessToken(token);
        const idToken = await currentUser.getIdToken();
        
        // This creates the server-side session cookie.
        // A 5s timeout ensures a hanging call never blocks the login redirect.
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
                signal: controller.signal,
            });
            clearTimeout(timeout);
        } catch (e) {
            console.warn("Auth: Session cookie sync failed or timed out.", e);
        }

        // --- High-Fidelity Profile Provisioning ---
        // Ensure that a Firestore profile exists for every authenticated user.
        // A 5s timeout prevents a Firestore hang from blocking the login redirect.
        try {
            const timeout = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Profile provisioning timed out')), 5000)
            );
            const profile = await Promise.race([getUserProfile(currentUser.uid), timeout]);
            if (!profile) {
                console.log(`Auth Context: Provisioning new profile for ${currentUser.email}`);
                await Promise.race([
                    updateUserProfile(currentUser.uid, currentUser.email!, {
                        displayName: currentUser.displayName || '',
                        role: 'editor', // Default role
                    }),
                    new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error('Profile update timed out')), 5000)
                    ),
                ]);
            }
        } catch (error) {
            console.error("Auth Context: Failed to provision user profile.", error);
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
    if (!isAuthLoading && pathname) {
      const isPublicPath = publicPaths.some(p => pathname.startsWith(p));
      const isMarketingPath = marketingPaths.some(p => pathname.startsWith(p)) || pathname === '/';
      
      // If the user is authenticated and on a public page (login/register), send them to welcome
      if (user && isPublicPath) {
        router.push('/welcome');
      }

      // If the user is NOT authenticated and NOT on a allowed path, send them to login
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
        {/* Always render children to prevent hydration mismatches and "Rendered more hooks" errors */}
        {children}
        
        {/* Render loading overlay on top if needed */}
        {isAuthLoading && (
            <div className="fixed inset-0 z-50 flex h-screen w-screen items-center justify-center bg-background">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4"></div>
                    <p className="font-semibold">Starting app...</p>
                </div>
            </div>
        )}
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