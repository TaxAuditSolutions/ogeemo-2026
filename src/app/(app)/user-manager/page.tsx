'use client';

import { useEffect, useState } from 'react';
import { UserListView } from '@/components/data/data-view';
import { useAuth } from '@/context/auth-context';
import { getUserProfile, type UserProfile } from '@/services/user-profile-service';
import { LoaderCircle, ShieldAlert, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function UserManagerPage() {
    const { user } = useAuth();
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        async function loadProfile() {
            if (user) {
                try {
                    const profile = await getUserProfile(user.uid);
                    if (isMounted) setUserProfile(profile);
                } catch (error) {
                    console.error("Failed to load user profile", error);
                }
            }
            if (isMounted) setIsLoading(false);
        }
        loadProfile();
        return () => { isMounted = false; };
    }, [user]);

    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!userProfile || userProfile.role !== 'admin') {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center gap-6 p-8 text-center animate-in fade-in zoom-in duration-300">
                <div className="rounded-full bg-destructive/10 p-6">
                    <ShieldAlert className="h-16 w-16 text-destructive" />
                </div>
                <div className="space-y-2 max-w-md">
                    <h1 className="text-2xl font-bold text-foreground">Restricted Area</h1>
                    <p className="text-muted-foreground">
                        You are not authorized to access this page. This section is reserved for administrators only.
                    </p>
                </div>
                <Button asChild variant="outline" size="lg" className="mt-4">
                    <Link href="/welcome">
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Return to Dashboard
                    </Link>
                </Button>
            </div>
        );
    }

    return <UserListView />;
}
