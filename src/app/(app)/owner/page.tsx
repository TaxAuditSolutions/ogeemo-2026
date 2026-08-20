'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
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
} from 'lucide-react';

export default function OwnerConsolePage() {
    const { isLoading: isAuthLoading, accessLevel, isMasterTenant } = useAuth();
    const { toast } = useToast();

    const [stats, setStats] = useState<OwnerDashboardStats | null>(null);
    const [tenants, setTenants] = useState<TenantSummary[]>([]);
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
        const action = newStatus === 'suspended' ? 'suspend' : 'activate';
        setActioningId(tenant.id);
        try {
            await updateTenantStatus(tenant.id, newStatus);
            toast({
                title: `Tenant ${action}d`,
                description: `"${tenant.name}" has been ${action}ed.`,
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
                <div className="space-y-2 max-w-md">
                    <h1 className="text-2xl font-bold text-foreground">Restricted Area</h1>
                    <p className="text-muted-foreground">
                        The Ogeemo Owner Console is reserved for Ogeemo master-tenant super admins.
                    </p>
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
                        Run the business of Ogeemo for your subscribers. Manage tenants, monitor growth, and control access.
                    </p>
                </div>
                <div className="flex gap-2">
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
                </div>
            </div>

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
                            <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
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
                                {stats.suspendedTenants} suspended
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
                        Complete list of all tenant companies. Suspend or activate access as needed.
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
                            <p>No subscribers yet. Create your first tenant to get started.</p>
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
                                                {tenant.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                variant={tenant.status === 'active' ? 'destructive' : 'default'}
                                                disabled={actioningId === tenant.id}
                                                onClick={() => handleToggleStatus(tenant)}
                                            >
                                                {actioningId === tenant.id ? (
                                                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                                ) : tenant.status === 'active' ? (
                                                    <PowerOff className="mr-2 h-4 w-4" />
                                                ) : (
                                                    <Power className="mr-2 h-4 w-4" />
                                                )}
                                                {tenant.status === 'active' ? 'Suspend' : 'Activate'}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}