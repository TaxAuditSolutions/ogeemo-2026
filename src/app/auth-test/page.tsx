
'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AuthTestPage() {
  const { user, signInWithGoogle, logout, accessToken } = useAuth();

  return (
    <div className="flex h-screen w-full items-center justify-center bg-muted">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Authentication Test</CardTitle>
          <CardDescription>
            Use this page to directly test the Google Sign-In flow.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full" onClick={signInWithGoogle}>
            Sign In with Google (Test)
          </Button>

          <Button className="w-full" variant="outline" onClick={logout}>
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
  );
}
