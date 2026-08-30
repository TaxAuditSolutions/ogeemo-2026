'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { collectionGroup, getDocs, query, where } from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import {
    getOwnerDashboardStats,
    listTenantsDetailed,
    updateTenantStatus,
    type TenantSummary,
    type OwnerDashboardStats,
} from '@/app/actions/owner-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Building2,
    Users,
    ShieldCheck,
    AlertTriangle,
    LoaderCircle,
    Crown,
    UserPlus,
    Activity,
    Power,
    PowerOff,
    RefreshCw,
    Info,
    CheckCircle2,
    ArrowRight,
    X,
    MoreVertical,
    Trash2,
} from 'lucide-react';

export default function OwnerConsolePage() {
    const { isLoading: isAuthLoading, accessLevel, isMasterTenant } = useAuth();
    const { toast } = useToast();

    const [stats, setStats] = useState<OwnerDashboardStats | null>(null);
    const [tenants, setTenants] = useState<TenantSummary[]>([]);
    const [selectedTenant, setSelectedTenant] = useState<TenantSummary | null>(null);
    const [tenantUsers, setTenantUsers] = useState<Array<{ id: string; email: string; displayName?: string; accessLevel?: string }>>([]);
    const [isLoadingTenantUsers, setIsLoadingTenantUsers] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'org_admin' | 'editor' | 'viewer'>('viewer');
    const [isInvitingUser, setIsInvitingUser] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [actioningId, setActioningId] = useState<string | null>(null);

    const canAccess = accessLevel === 'super_admin' && isMasterTenant;

    const loadData = useCallback(async () => {
        setIsLoadingData(true);
        try {
            const [statsResult, tenantsResult] = await Promise.all([
                getOwnerDashboardStats(),
                listTenantsDetailed(),
            ]);
            setStats(statsResult);
            setTenants(tenantsResult);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Load Failed', description: error.message });
        } finally {
            setIsLoadingData(false);
        }
    }, [toast]);

    useEffect(() => {
        if (canAccess) loadData();
    }, [canAccess, loadData]);

    const handleToggleStatus = async (tenant: TenantSummary) => {
        const newStatus = tenant.status === 'active' ? 'suspended' : 'active';
        const action = newStatus === 'suspended' ? 'pause' : 'activate';
        setActioningId(tenant.id);
        try {
            await updateTenantStatus(tenant.id, newStatus);
            toast({
                title: `Tenant ${action}d`,
                description: `"${tenant.name}" has been ${action}d.`,
            });
            // Update local state
            setTenants((prev) =>
                prev.map((t) => (t.id === tenant.id ? { ...t, status: newStatus } : t))
            );
            // Refresh stats
            const newStats = await getOwnerDashboardStats();
            setStats(newStats);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Action Failed', description: error.message });
        } finally {
            setActioningId(null);
        }
    };

    const loadTenantUsers = useCallback(async (tenant: TenantSummary) => {
        setSelectedTenant(tenant);
        setIsLoadingTenantUsers(true);
        setTenantUsers([]);
        setInviteEmail('');
        setInviteRole('viewer');
        try {
            const { db } = getFirebaseServices();
            const { getUsers } = await import('@/core/user-profile-service');

            const users = await getUsers(tenant.id);
            const memberMap = new Map<string, { id: string; email: string; displayName?: string; accessLevel?: string }>();

            users.forEach((user) => {
                memberMap.set(user.id, {
                    id: user.id,
                    email: user.email,
                    displayName: user.displayName,
                    accessLevel: user.accessLevel,
                });
            });

            try {
                const orgMembershipQuery = query(collectionGroup(db, 'orgMemberships'), where('orgId', '==', tenant.id));
                const membershipSnapshot = await getDocs(orgMembershipQuery);
                membershipSnapshot.forEach((docSnap) => {
                    const parentId = docSnap.ref.parent?.parent?.id;
                    if (!parentId) return;
                    const membership = docSnap.data();
                    const current = memberMap.get(parentId);
                    memberMap.set(parentId, {
                        id: parentId,
                        email: current?.email || membership.email || `${parentId}@tenant-member`,
                        displayName: current?.displayName || membership.companyName || 'Tenant Member',
                        accessLevel: current?.accessLevel || (membership.accessLevel as string) || 'viewer',
                    });
                });
            } catch {
                // Ignore fallback membership read failures and keep the primary profile list.
            }

            setTenantUsers(Array.from(memberMap.values()));
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Users Load Failed', description: error.message });
        } finally {
            setIsLoadingTenantUsers(false);
        }
    }, [toast]);

    const handleInviteTenantUser = async () => {
        if (!selectedTenant) return;
        if (!inviteEmail.trim()) {
            toast({ variant: 'destructive', title: 'Email required', description: 'Enter a user email to invite.' });
            return;
        }

        setIsInvitingUser(true);
        try {
            const { inviteUser } = await import('@/app/actions/org-actions');
            await inviteUser({
                invitedEmail: inviteEmail.trim(),
                targetRole: inviteRole,
                orgId: selectedTenant.id,
            });
            toast({
                title: 'Invitation Sent',
                description: `A tenant invite was sent to ${inviteEmail.trim()} for ${selectedTenant.name}.`,
            });
            setInviteEmail('');
            setInviteRole('viewer');
            await loadTenantUsers(selectedTenant);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Invite Failed', description: error.message });
        } finally {
            setIsInvitingUser(false);
        }
    };

    const handleRemoveTenantUser = async (userId: string, userName: string) => {
        if (!selectedTenant) return;
        try {
            const { removeUser } = await import('@/app/actions/org-actions');
            await removeUser(userId);
            toast({
                title: 'User Removed',
                description: `${userName} was removed from ${selectedTenant.name}.`,
            });
            await loadTenantUsers(selectedTenant);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Remove Failed', description: error.message });
        }
    };

    const handleClose = () => {
        if (typeof window === 'undefined') return;
        if (window.history.length > 1) {
            window.history.back();
            return;
        }
        window.location.href = '/welcome';
    };

    if (isAuthLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!canAccess) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center gap-6 p-8 text-center">
                <div className="rounded-full bg-destructive/10 p-6">
                    <AlertTriangle className="h-16 w-16 text-destructive" />
                </div>
                <div className="space-y-3 max-w-2xl">
                    <h1 className="text-2xl font-bold text-foreground">Restricted Area</h1>
                    <p className="text-muted-foreground">
                        The Ogeemo Owner Console is reserved for the master tenant and only visible to a user with
                        super admin access on the Ogeemo organization.
                    </p>
                    <Card className="text-left">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Info className="h-5 w-5 text-primary" />
                                How to access the Owner Console
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm text-muted-foreground">
                            <div className="flex gap-3">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                                <span>Switch your active organization to the Ogeemo master tenant in the org switcher.</span>
                            </div>
                            <div className="flex gap-3">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                                <span>Confirm your account has <strong>accessLevel = super_admin</strong> and the master-tenant claim is active.</span>
                            </div>
                            <div className="flex gap-3">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                                <span>Log out and back in after any role or claim change so the updated token is refreshed.</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Crown className="h-6 w-6 text-primary" />
                        Ogeemo Owner Console
                    </h1>
                    <p className="text-muted-foreground">
                        This page is for monitoring subscribers. New tenant companies are created in the Tenant Manager, then they appear here.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={loadData} disabled={isLoadingData}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingData ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button asChild size="sm">
                        <Link href="/tenant-manager">
                            <UserPlus className="mr-2 h-4 w-4" />
                            New Tenant
                        </Link>
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Close owner console"
                        onClick={handleClose}
                        className="ml-1 h-9 w-9 rounded-full border border-border/60 bg-background"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Info className="h-5 w-5 text-primary" />
                        Owner Console Instructions
                    </CardTitle>
                    <CardDescription>
                        Use this console to monitor subscriber tenants, create new tenant companies, and manage tenant access.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border bg-background/60 p-3">
                        <p className="text-sm font-semibold">1. Open Tenant Manager</p>
                        <p className="mt-1 text-sm text-muted-foreground">Use <strong>New Tenant</strong> to open the Tenant Manager and create a subscriber company and its founding admin.</p>
                    </div>
                    <div className="rounded-lg border bg-background/60 p-3">
                        <p className="text-sm font-semibold">2. Review Subscribers</p>
                        <p className="mt-1 text-sm text-muted-foreground">Once a tenant is created, it appears here in the subscriber list, owners, and user totals.</p>
                    </div>
                    <div className="rounded-lg border bg-background/60 p-3">
                        <p className="text-sm font-semibold">3. Control Access</p>
                        <p className="mt-1 text-sm text-muted-foreground">Pause or activate tenant access as needed without deleting the tenant record.</p>
                    </div>
                    <div className="rounded-lg border bg-background/60 p-3">
                        <p className="text-sm font-semibold">4. Refresh Metrics</p>
                        <p className="mt-1 text-sm text-muted-foreground">Use <strong>Refresh</strong> after creating or updating tenants to update the owner dashboard.</p>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Cards */}
            {isLoadingData && !stats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader className="pb-2">
                                <div className="h-4 w-24 bg-muted rounded" />
                            </CardHeader>
                            <CardContent>
                                <div className="h-8 w-16 bg-muted rounded" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : stats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">All Subscriber Tenants</CardTitle>
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalTenants}</div>
                            <p className="text-xs text-muted-foreground">Active companies</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
                            <Activity className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{stats.activeTenants}</div>
                            <p className="text-xs text-muted-foreground">
                                {stats.suspendedTenants} paused
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalUsers}</div>
                            <p className="text-xs text-muted-foreground">Across all tenants</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Admins</CardTitle>
                            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalAdmins}</div>
                            <p className="text-xs text-muted-foreground">Super + Org admins</p>
                        </CardContent>
                    </Card>
                </div>
            ) : null}

            {/* Recent Tenants Quick View */}
            {stats && stats.recentTenants.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" />
                            Recent Subscribers
                        </CardTitle>
                        <CardDescription>The latest companies to join Ogeemo.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {stats.recentTenants.map((tenant) => (
                                <div
                                    key={tenant.id}
                                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                                >
                                    <div className="min-w-0">
                                        <p className="font-semibold truncate">{tenant.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {tenant.ownerEmail || 'No owner email'}
                                        </p>
                                    </div>
                                    <Badge
                                        variant={tenant.status === 'active' ? 'default' : 'destructive'}
                                        className="ml-2 shrink-0"
                                    >
                                        {tenant.status}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Full Tenant Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        All Subscribers
                    </CardTitle>
                    <CardDescription>
                        This is the subscriber roster. Tenants appear here after they are created in the Tenant Manager.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingData ? (
                        <div className="flex justify-center p-8">
                            <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : tenants.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No subscriber tenants have been created yet.</p>
                            <p className="mt-1 text-sm">Create your first tenant above to begin adding subscribers.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Company</TableHead>
                                    <TableHead>Owner</TableHead>
                                    <TableHead className="text-center">Users</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tenants.map((tenant) => (
                                    <TableRow key={tenant.id}>
                                        <TableCell className="font-medium">{tenant.name}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-sm">{tenant.ownerName || '—'}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {tenant.ownerEmail || 'No email'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary">{tenant.userCount}</Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge
                                                variant={tenant.status === 'active' ? 'default' : 'destructive'}
                                            >
                                                {tenant.status === 'active' ? 'Active' : 'Paused'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        disabled={actioningId === tenant.id}
                                                    >
                                                        {actioningId === tenant.id ? (
                                                            <LoaderCircle className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <MoreVertical className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onSelect={() => loadTenantUsers(tenant)}>
                                                        <Users className="mr-2 h-4 w-4" />
                                                        Manage Users
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onSelect={() => tenant.status === 'active' && handleToggleStatus(tenant)}
                                                        disabled={tenant.status !== 'active'}
                                                    >
                                                        <PowerOff className="mr-2 h-4 w-4" />
                                                        Pause
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onSelect={() => tenant.status !== 'active' && handleToggleStatus(tenant)}
                                                        disabled={tenant.status === 'active'}
                                                    >
                                                        <Power className="mr-2 h-4 w-4" />
                                                        Activate
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={Boolean(selectedTenant)} onOpenChange={(open) => {
                if (!open) {
                    setSelectedTenant(null);
                    setTenantUsers([]);
                    setInviteEmail('');
                    setInviteRole('viewer');
                }
            }}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            {selectedTenant ? `${selectedTenant.name} Users` : 'Tenant Users'}
                        </DialogTitle>
                        <DialogDescription>
                            Review users in this tenant and invite a new member into the selected subscriber workspace.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 py-2">
                        <div className="rounded-lg border bg-muted/30 p-4">
                            <div className="mb-3 flex items-center justify-between gap-2">
                                <p className="text-sm font-medium">Invite User</p>
                                <Badge variant="secondary">Tenant Scoped</Badge>
                            </div>
                            <div className="grid gap-3 md:grid-cols-[1fr_180px]">
                                <Input
                                    type="email"
                                    placeholder="team-member@company.com"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    disabled={isInvitingUser || !selectedTenant}
                                />
                                <Select
                                    value={inviteRole}
                                    onValueChange={(value) => setInviteRole(value as 'org_admin' | 'editor' | 'viewer')}
                                    disabled={isInvitingUser || !selectedTenant}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="viewer">Viewer</SelectItem>
                                        <SelectItem value="editor">Editor</SelectItem>
                                        <SelectItem value="org_admin">Org Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="mt-3 flex justify-end">
                                <Button
                                    onClick={handleInviteTenantUser}
                                    disabled={isInvitingUser || !selectedTenant || !inviteEmail.trim()}
                                >
                                    {isInvitingUser ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Invite User
                                </Button>
                            </div>
                        </div>

                        <div>
                            <p className="mb-2 text-sm font-medium">Current Tenant Members</p>
                            {isLoadingTenantUsers ? (
                                <div className="flex justify-center py-8">
                                    <LoaderCircle className="h-6 w-6 animate-spin text-primary" />
                                </div>
                            ) : tenantUsers.length === 0 ? (
                                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                                    No users have been added to this tenant yet.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {tenantUsers.map((user) => (
                                        <div key={user.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-medium">{user.displayName || 'Unnamed User'}</p>
                                                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary" className="uppercase">
                                                    {user.accessLevel || 'viewer'}
                                                </Badge>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                    aria-label={`Remove ${user.displayName || user.email}`}
                                                    onClick={() => handleRemoveTenantUser(user.id, user.displayName || user.email)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedTenant(null)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}