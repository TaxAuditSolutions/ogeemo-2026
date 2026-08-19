'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { createTenantWithSuperAdmin, listCompanies } from '@/app/actions/org-actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoaderCircle, ShieldAlert, Building2 } from 'lucide-react';

interface Company {
    id: string;
    name: string;
    ownerUid: string | null;
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

    const handleCreateTenant = async () => {
        if (!companyName.trim() || !adminEmail.trim()) return;
        setIsCreating(true);
        try {
            await createTenantWithSuperAdmin({
                companyName: companyName.trim(),
                email: adminEmail.trim(),
                name: adminName.trim() || undefined,
                password: adminPassword.trim() || undefined,
            });
            toast({ title: 'Tenant Created', description: `"${companyName}" has been provisioned with ${adminEmail} as its super admin.` });
            setCompanyName('');
            setAdminEmail('');
            setAdminName('');
            setAdminPassword('');
            loadCompanies();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Creation Failed', description: error.message });
        } finally {
            setIsCreating(false);
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
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="h-6 w-6 text-primary" /> Tenant Management</h1>
                <p className="text-muted-foreground">Provision new companies with their founding super admin. Master-tenant access never extends to a company's own data.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Create Tenant</CardTitle>
                    <CardDescription>Creates a new, fully isolated company along with its super admin in one step.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label>Company Name</Label>
                        <Input placeholder="Acme Inc." value={companyName} onChange={(e) => setCompanyName(e.target.value)} disabled={isCreating} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Admin Email</Label>
                        <Input type="email" placeholder="admin@acme.com" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} disabled={isCreating} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Admin Name (optional)</Label>
                        <Input placeholder="Jane Doe" value={adminName} onChange={(e) => setAdminName(e.target.value)} disabled={isCreating} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Admin Password (optional)</Label>
                        <Input type="password" placeholder="Leave blank to send a reset link" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} disabled={isCreating} />
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
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Owner</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {companies.map((company) => (
                                    <TableRow key={company.id}>
                                        <TableCell>{company.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{company.ownerUid || 'Unassigned'}</TableCell>
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
