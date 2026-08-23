'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import {
    createTenantWithSuperAdmin,
    checkTenantAdminEmailExists,
    listCompanies,
    updateTenantStatus,
    updateTenantDetails,
    deleteTenant,
} from '@/app/actions/org-actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    LoaderCircle,
    ShieldAlert,
    Building2,
    Eye,
    EyeOff,
    Info,
    MoreVertical,
    Pencil,
    Trash2,
    Power,
    PowerOff,
} from 'lucide-react';

interface Company {
    id: string;
    name: string;
    ownerUid: string | null;
    status: 'active' | 'suspended';
    adminEmail: string;
    adminName: string;
}

export default function TenantManagerPage() {
    const { isLoading: isAuthLoading, accessLevel, isMasterTenant } = useAuth();
    const { toast } = useToast();

    const [companies, setCompanies] = useState<Company[]>([]);
    const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
    const [companyName, setCompanyName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminName, setAdminName] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isExistingAccount, setIsExistingAccount] = useState(false);

    // Edit state
    const [actioningId, setActioningId] = useState<string | null>(null);
    const [editCompany, setEditCompany] = useState<Company | null>(null);
    const [editName, setEditName] = useState('');
    const [editAdminEmail, setEditAdminEmail] = useState('');
    const [editAdminName, setEditAdminName] = useState('');
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Delete state
    const [deleteCompany, setDeleteCompany] = useState<Company | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const canAccess = accessLevel === 'super_admin' && isMasterTenant;

    const loadCompanies = useCallback(async () => {
        setIsLoadingCompanies(true);
        try {
            const result = await listCompanies();
            setCompanies(result);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Load Failed', description: error.message });
        } finally {
            setIsLoadingCompanies(false);
        }
    }, [toast]);

    useEffect(() => {
        if (canAccess) loadCompanies();
    }, [canAccess, loadCompanies]);

    useEffect(() => {
        const email = adminEmail.trim();
        if (!canAccess || !email || !email.includes('@')) {
            setIsExistingAccount(false);
            return;
        }
        let cancelled = false;
        const timer = setTimeout(() => {
            checkTenantAdminEmailExists(email)
                .then((exists) => { if (!cancelled) setIsExistingAccount(exists); })
                .catch(() => { if (!cancelled) setIsExistingAccount(false); });
        }, 400);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [adminEmail, canAccess]);

    const handleCreateTenant = async () => {
        if (!companyName.trim() || !adminEmail.trim()) return;
        setIsCreating(true);
        try {
            const result = await createTenantWithSuperAdmin({
                companyName: companyName.trim(),
                email: adminEmail.trim(),
                name: adminName.trim() || undefined,
                password: adminPassword.trim() || undefined,
            });
            toast({
                title: 'Tenant Created',
                description: result.reusedExistingAccount
                    ? `"${companyName}" has been provisioned. ${adminEmail} already had an account, so it was granted super admin access to this new tenant (use the org switcher to manage it).`
                    : `"${companyName}" has been provisioned with ${adminEmail} as its super admin.`,
            });
            setCompanyName('');
            setAdminEmail('');
            setAdminName('');
            setAdminPassword('');
            setIsExistingAccount(false);
            loadCompanies();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Creation Failed', description: error.message });
        } finally {
            setIsCreating(false);
        }
    };


    const handleOpenEdit = (company: Company) => {
        setEditCompany(company);
        setEditName(company.name);
        setEditAdminEmail(company.adminEmail);
        setEditAdminName(company.adminName);
        setIsEditOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editCompany || !editName.trim() || !editAdminEmail.trim()) return;
        setIsSaving(true);
        try {
            await updateTenantDetails(editCompany.id, editName.trim(), editAdminEmail.trim(), editAdminName.trim());
            toast({ title: 'Tenant Updated', description: `Details updated for "${editName.trim()}".` });
            setCompanies((prev) =>
                prev.map((c) => c.id === editCompany.id ? { ...c, name: editName.trim(), adminEmail: editAdminEmail.trim(), adminName: editAdminName.trim() } : c)
            );
            setIsEditOpen(false);
            setEditCompany(null);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleStatus = async (company: Company) => {
        const newStatus = company.status === 'active' ? 'suspended' : 'active';
        const action = newStatus === 'suspended' ? 'suspend' : 'activate';
        setActioningId(company.id);
        try {
            await updateTenantStatus(company.id, newStatus);
            toast({ title: `Tenant ${action}d`, description: `"${company.name}" has been ${action}ed.` });
            setCompanies((prev) =>
                prev.map((c) => (c.id === company.id ? { ...c, status: newStatus } : c))
            );
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Action Failed', description: error.message });
        } finally {
            setActioningId(null);
        }
    };

    const handleDelete = async () => {
        if (!deleteCompany) return;
        setActioningId(deleteCompany.id);
        try {
            await deleteTenant(deleteCompany.id);
            toast({ title: 'Tenant Deleted', description: `"${deleteCompany.name}" and all its users have been removed.` });
            setCompanies((prev) => prev.filter((c) => c.id !== deleteCompany.id));
            setIsDeleteOpen(false);
            setDeleteCompany(null);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
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
                    <ShieldAlert className="h-16 w-16 text-destructive" />
                </div>
                <div className="space-y-2 max-w-md">
                    <h1 className="text-2xl font-bold text-foreground">Restricted Area</h1>
                    <p className="text-muted-foreground">
                        Tenant Management is reserved for Ogeemo master-tenant super admins.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="h-6 w-6 text-primary" /> Tenant Management</h1>
                    <p className="text-muted-foreground">Provision new companies with their founding super admin. Master-tenant access never extends to a company's own data.</p>
                </div>
                <Button asChild variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label="Open tenant manager instructions">
                    <Link href="/tenant-manager/instructions">
                        <Info className="h-4 w-4" />
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Create Tenant</CardTitle>
                    <CardDescription>Creates a new, fully isolated company along with its super admin in one step.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label>Company Name</Label>
                        <Input
                            name="tenant-company-name"
                            placeholder="Acme Inc."
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            disabled={isCreating}
                            autoComplete="organization"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Admin Email</Label>
                        <Input
                            type="email"
                            name="tenant-admin-email"
                            placeholder="admin@acme.com"
                            value={adminEmail}
                            onChange={(e) => setAdminEmail(e.target.value)}
                            disabled={isCreating}
                            autoComplete="off"
                            spellCheck={false}
                        />
                        {isExistingAccount && (
                            <p className="text-xs text-muted-foreground">
                                This email already has an account. It will be granted super admin access to the new tenant — its existing password stays unchanged.
                            </p>
                        )}
                    </div>
                    <div className="space-y-1.5">
                        <Label>Admin Name (optional)</Label>
                        <Input placeholder="Jane Doe" value={adminName} onChange={(e) => setAdminName(e.target.value)} disabled={isCreating} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Admin Password (optional)</Label>
                        <div className="relative">
                            <Input
                                type={showPassword ? 'text' : 'password'}
                                name="tenant-admin-password"
                                autoComplete="new-password"
                                placeholder={isExistingAccount ? 'Not used — existing password stays the same' : 'Leave blank to send a reset link'}
                                value={adminPassword}
                                onChange={(e) => setAdminPassword(e.target.value)}
                                disabled={isCreating || isExistingAccount}
                                className="pr-10"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                                disabled={isExistingAccount}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <Button onClick={handleCreateTenant} disabled={isCreating || !companyName.trim() || !adminEmail.trim()}>
                            {isCreating ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Create Tenant
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Companies</CardTitle>
                    <CardDescription>All tenants provisioned outside the master tenant.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingCompanies ? (
                        <div className="flex justify-center p-8"><LoaderCircle className="h-8 w-8 animate-spin text-primary" /></div>
                    ) : companies.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No companies yet. Create your first tenant above.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Company Name</TableHead>
                                    <TableHead>Super Admin Name</TableHead>
                                    <TableHead>Admin Email</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {companies.map((company) => (
                                    <TableRow key={company.id}>
                                        <TableCell className="font-medium">{company.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{company.adminName || '—'}</TableCell>
                                        <TableCell className="text-muted-foreground">{company.adminEmail || '—'}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={company.status === 'active' ? 'default' : 'destructive'}>
                                                {company.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        disabled={actioningId === company.id}
                                                    >
                                                        {actioningId === company.id ? (
                                                            <LoaderCircle className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <MoreVertical className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onSelect={() => handleOpenEdit(company)}
                                                    >
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onSelect={() => handleToggleStatus(company)}
                                                    >
                                                        {company.status === 'active' ? (
                                                            <>
                                                                <PowerOff className="mr-2 h-4 w-4" />
                                                                Suspend
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Power className="mr-2 h-4 w-4" />
                                                                Activate
                                                            </>
                                                        )}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive"
                                                        onSelect={() => {
                                                            setDeleteCompany(company);
                                                            setIsDeleteOpen(true);
                                                        }}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete
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

            {/* Edit Tenant Dialog - same form as Create Tenant, pre-populated */}
            <Dialog open={isEditOpen} onOpenChange={(open) => {
                setIsEditOpen(open);
                if (!open) {
                    setEditCompany(null);
                    setEditName('');
                    setEditAdminEmail('');
                    setEditAdminName('');
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Tenant</DialogTitle>
                        <DialogDescription>
                            Update the company name and admin details for this tenant.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                        <div className="space-y-1.5">
                            <Label>Company Name</Label>
                            <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="Company name"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Admin Email</Label>
                            <Input
                                type="email"
                                value={editAdminEmail}
                                onChange={(e) => setEditAdminEmail(e.target.value)}
                                placeholder="admin@acme.com"
                            />
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                            <Label>Admin Name</Label>
                            <Input
                                value={editAdminName}
                                onChange={(e) => setEditAdminName(e.target.value)}
                                placeholder="Jane Doe"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveEdit} disabled={!editName.trim() || !editAdminEmail.trim() || isSaving}>
                            {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteOpen} onOpenChange={(open) => {
                setIsDeleteOpen(open);
                if (!open) setDeleteCompany(null);
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Tenant</DialogTitle>
                        <DialogDescription>
                            This will permanently delete <strong>{deleteCompany?.name}</strong> and remove all its user profiles.
                            Firebase Auth users will be disabled to preserve audit trails. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={actioningId === deleteCompany?.id}
                        >
                            {actioningId === deleteCompany?.id ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Delete Tenant
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}