
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import LoadingModal from '@/components/ui/loading-modal';

export default function AuthTestPage() {
  const { user, signInWithGoogle, logout, accessToken } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      // On success, the AuthProvider handles the redirect.
      // We can set loading to false in case the redirect is slow.
      setIsLoading(false);
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        toast({
            title: "Sign-in Failed",
            description: error.message || "An unexpected error occurred.",
            variant: "destructive",
        });
      }
      // Silently ignore user cancellation and just stop the loading indicator.
      setIsLoading(false);
    }
  };

  return (
    <>
      {isLoading && <LoadingModal message="Waiting for Google..." />}
      <div className="flex h-screen w-full items-center justify-center bg-muted">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Test</CardTitle>
            <CardDescription>
              Use this page to directly test the Google Sign-In flow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" onClick={handleSignIn} disabled={isLoading}>
              Sign In with Google (Test)
            </Button>

            <Button className="w-full" variant="outline" onClick={logout} disabled={isLoading}>
              Logout
            </Button>

            <div className="mt-4 space-y-2 rounded-md border p-4 text-sm">
              <h3 className="font-semibold">Current Status:</h3>
              <p>
                <strong>User:</strong> {user ? user.email : 'Not logged in'}
              </p>
              <p className="truncate">
                <strong>Access Token:</strong> {accessToken ? `${accessToken.substring(0, 30)}...` : 'None'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
