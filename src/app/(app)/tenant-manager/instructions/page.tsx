'use client';

import Link from 'next/link';
import { ArrowLeft, Building2, ShieldCheck, Users, UserPlus, Database, KeyRound, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TenantManagerInstructionsPage() {
    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-3">
                <Button asChild variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label="Back to tenant manager">
                    <Link href="/tenant-manager">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Building2 className="h-6 w-6 text-primary" />
                        Tenant Manager Guide
                    </h1>
                    <p className="text-muted-foreground">How to create, manage, and understand tenants in Ogeemo.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Who can use this page</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                    <div className="flex gap-3">
                        <ShieldCheck className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                        <p>
                            This page is restricted to the Ogeemo master tenant. Only a user with
                            <span className="font-semibold text-foreground"> super_admin access </span>
                            and <span className="font-semibold text-foreground"> isMasterTenant = true </span>
                            can create, view, edit, suspend, or delete tenant organizations.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>What this page does</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 text-sm text-muted-foreground">
                    <div className="flex gap-3">
                        <Building2 className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                        <p>
                            The Tenant Manager creates brand-new customer companies, each with its own isolated organization and founding super admin.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Users className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                        <p>
                            It also lets the master tenant review all current non-master tenant organizations and manage their status.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>How to create a tenant</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                    <ol className="list-decimal space-y-3 pl-5">
                        <li>Enter the new company name.</li>
                        <li>Enter the founding admin email.</li>
                        <li>Optionally add the admin name.</li>
                        <li>Optionally enter a password for a brand-new account.</li>
                        <li>Click <span className="font-semibold text-foreground">Create Tenant</span>.</li>
                    </ol>
                    <div className="rounded-md border border-dashed border-primary/30 bg-primary/5 p-3 text-xs text-foreground">
                        If the admin email already exists in Firebase Auth, Ogeemo reuses that account and grants it super admin access to the new tenant instead of creating a duplicate login.
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Important behavior</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                    <div className="flex gap-3">
                        <KeyRound className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                        <p>
                            A password field is only used when creating a brand-new auth account. If the email already belongs to an existing user, the password stays unchanged.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Database className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                        <p>
                            Each tenant is isolated. The master tenant is not the same as a customer tenant, and master-tenant access does not automatically grant business access inside a customer org.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Tenant actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                    <div className="flex gap-3">
                        <UserPlus className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                        <p>
                            You can review the tenant list, open a tenant for editing, suspend or reactivate it, and delete it when appropriate.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <BadgeCheck className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                        <p>
                            The founding admin for each tenant is treated as the organization owner and gets the full super admin role within that tenant.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
