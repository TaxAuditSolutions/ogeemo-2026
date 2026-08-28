'use client';

import { useEffect, useState } from 'react';
import { UserListView } from '@/components/data/data-view';
import { useAuth } from '@/context/auth-context';
import { getUserProfile, type UserProfile } from '@/core/user-profile-service';
import { LoaderCircle, ShieldAlert, ChevronLeft, Info, Users, Building2, SwitchCamera, ShieldCheck, FolderLock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export default function UserManagerPage() {
    const { user } = useAuth();
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isInfoOpen, setIsInfoOpen] = useState(false);

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

    if (!userProfile || (userProfile.accessLevel !== 'org_admin' && userProfile.accessLevel !== 'super_admin')) {
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

    return (
        <div className="relative">
            <div className="absolute right-6 top-6 z-10">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                    aria-label="Open user manager help"
                    onClick={() => setIsInfoOpen(true)}
                >
                    <Info className="h-4 w-4" />
                </Button>
            </div>

            <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-primary">
                            <Users className="h-5 w-5" />
                            How the User Manager handles multi-tenancy
                        </DialogTitle>
                        <DialogDescription>
                            This is the exact model Ogeemo uses for companies, memberships, and role-based access.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 pb-2 text-sm leading-6 text-muted-foreground">
                        <div className="rounded-xl border bg-muted/30 p-4">
                            <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
                                <Building2 className="h-4 w-4 text-primary" />
                                One tenant = one company workspace
                            </div>
                            <p>
                                Ogeemo is organized around a <strong>tenant</strong>, which represents one company or organization. Each tenant is a separate silo of data, users, permissions, and company settings. Users in one tenant cannot see data from another tenant unless they explicitly belong to both and switch into the desired tenant context.
                            </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-xl border bg-muted/30 p-4">
                                <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
                                    <Users className="h-4 w-4 text-primary" />
                                    A user can belong to multiple tenants
                                </div>
                                <p>
                                    One person can be a member of more than one company workspace. The user profile is kept as one identity, but the active company context can change based on the tenant they choose. This enables agencies, consultants, parent companies, or multi-entity operators to work across multiple businesses without creating duplicate accounts.
                                </p>
                            </div>

                            <div className="rounded-xl border bg-muted/30 p-4">
                                <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
                                    <SwitchCamera className="h-4 w-4 text-primary" />
                                    Switching is always intentional
                                </div>
                                <p>
                                    When a user has access to more than one tenant, they can switch workspaces from the user menu. The app updates the active org context and reissues the session. Every following data query then resolves against the selected tenant instead of the previous one.
                                </p>
                            </div>
                        </div>

                        <div className="rounded-xl border bg-muted/30 p-4">
                            <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
                                <ShieldCheck className="h-4 w-4 text-primary" />
                                Roles are evaluated per tenant
                            </div>
                            <p>
                                The user’s role is scoped to the selected tenant. A person may be an admin in one company and a viewer in another. The role rules are enforced within that tenant boundary, so access is never treated as global across every tenant the user belongs to.
                            </p>
                        </div>

                        <div className="rounded-xl border bg-muted/30 p-4">
                            <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
                                <FolderLock className="h-4 w-4 text-primary" />
                                Data isolation remains strict
                            </div>
                            <p>
                                Firestore and tenant rules are designed to keep each company’s records isolated by orgId. A user in Tenant A does not automatically see data from Tenant B, even if they are logged in with the same email address. Cross-tenant data leakage is blocked by the tenant boundary, and the app only reads and writes data for the active tenant context.
                            </p>
                        </div>

                        <div className="rounded-xl border bg-muted/30 p-4">
                            <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
                                <Users className="h-4 w-4 text-primary" />
                                Inviting users is also tenant-specific
                            </div>
                            <p>
                                Administrators manage users inside the selected tenant. When a new user is invited, they are invited into that specific company workspace. A user is only granted access to a tenant if they are added as a member of that tenant or they are created through that tenant’s admin flow. This prevents accidental cross-company access.
                            </p>
                        </div>

                        <div className="rounded-xl border bg-muted/30 p-4">
                            <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
                                <ArrowRight className="h-4 w-4 text-primary" />
                                This is the recommended behavior for clients with multiple companies
                            </div>
                            <p>
                                For a client with several companies, the clean setup is: one user identity, multiple tenant memberships, and a workspace switcher. The user logs in once, then chooses the company they want to work in. This gives a cleaner, more scalable model than re-registering a separate account for each company or mixing company data into one shared tenant.
                            </p>
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button asChild variant="outline" size="sm">
                                <Link href="/user-manager/instructions">
                                    Open full instructions page
                                </Link>
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <UserListView />
        </div>
    );
}
