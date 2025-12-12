
'use client';

import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { initializeFirebase } from '@/lib/firebase';

export default function LogoutPage() {
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      const { auth } = await initializeFirebase();
      await signOut(auth);
      // The redirect to /login is handled by the AuthProvider listener,
      // but we can also push it here for a faster redirect.
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        variant: 'destructive',
        title: 'Logout Failed',
        description: 'An unexpected error occurred. Please try again.',
      });
    }
  };

  return (
    <div className="flex h-full items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sign out of Ogeemo</CardTitle>
          <CardDescription>
            This will sign you out of your Ogeemo App.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button onClick={handleLogout} size="lg">
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
