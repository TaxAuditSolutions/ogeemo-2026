'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, LoaderCircle, Save, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { getOrganization, updateOrganizationDetails } from '@/core/organization-service';
import { resolveOrgId } from '@/services/branding-service';
import { brandingErrorMessage } from '@/lib/branding-utils';

/**
 * Settings card for the workspace's company identity: name, address, phone, email and
 * business (HST) number shown as the issuing business on invoices and quotes.
 * Saved once per workspace; Firestore rules restrict saving to org admins.
 */
export function CompanyInformationCard() {
    const { accessLevel } = useAuth();
    const { toast } = useToast();
    const isAdmin = accessLevel === 'org_admin' || accessLevel === 'super_admin';

    const [orgId, setOrgId] = useState<string | null>(null);
    const [isBusy, setIsBusy] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);
    const [name, setName] = useState('');
    const [street, setStreet] = useState('');
    const [city, setCity] = useState('');
    const [provinceState, setProvinceState] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [country, setCountry] = useState('');
    const [businessPhone, setBusinessPhone] = useState('');
    const [email, setEmail] = useState('');
    const [businessNumber, setBusinessNumber] = useState('');

    useEffect(() => {
        let cancelled = false;
        resolveOrgId().then((id) => {
            if (!cancelled) setOrgId(id);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!orgId) return;
        let cancelled = false;
        getOrganization(orgId)
            .then((org) => {
                if (cancelled || !org) return;
                setName(org.name || '');
                setStreet(org.businessAddress?.street || '');
                setCity(org.businessAddress?.city || '');
                setProvinceState(org.businessAddress?.state || '');
                setPostalCode(org.businessAddress?.postalCode || '');
                setCountry(org.businessAddress?.country || '');
                setBusinessPhone(org.businessPhone || '');
                setEmail(org.email || '');
                setBusinessNumber(org.businessNumber || '');
                setIsHydrated(true);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [orgId]);

    // This card sits inside the Settings form; block Enter so it cannot trigger the profile submit.
    const stopEnter = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') e.preventDefault();
    };

    const handleSave = async () => {
        if (!orgId) return;
        setIsBusy(true);
        try {
            await updateOrganizationDetails(orgId, {
                name,
                businessAddress: { street, city, state: provinceState, postalCode, country },
                businessPhone,
                email,
                businessNumber,
            });
            toast({
                title: 'Company information saved',
                description: 'Invoices and quotes now show these details for the issuing business.',
            });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Could not save company information', description: brandingErrorMessage(error) });
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <Card>
            <CardHeader className="bg-primary/5 border-b">
                <div className="flex items-center gap-3">
                    <Building2 className="h-6 w-6 text-primary" />
                    <CardTitle className="text-base">Company Information</CardTitle>
                </div>
                <CardDescription>
                    The name, address, phone, email and business number (HST #) shown as the issuing business on your
                    invoices and quotes. Saved once for this workspace.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="orgName">Company Name</Label>
                    <Input id="orgName" value={name} onChange={(e) => setName(e.target.value)} disabled={!isAdmin} onKeyDown={stopEnter} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="orgStreet">Street</Label>
                    <Input id="orgStreet" value={street} onChange={(e) => setStreet(e.target.value)} disabled={!isAdmin} onKeyDown={stopEnter} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="orgCity">City</Label>
                        <Input id="orgCity" value={city} onChange={(e) => setCity(e.target.value)} disabled={!isAdmin} onKeyDown={stopEnter} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="orgState">State / Province</Label>
                        <Input id="orgState" value={provinceState} onChange={(e) => setProvinceState(e.target.value)} disabled={!isAdmin} onKeyDown={stopEnter} />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="orgPostal">Postal Code</Label>
                        <Input id="orgPostal" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} disabled={!isAdmin} onKeyDown={stopEnter} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="orgCountry">Country</Label>
                        <Input id="orgCountry" value={country} onChange={(e) => setCountry(e.target.value)} disabled={!isAdmin} onKeyDown={stopEnter} />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="orgPhone">Business Phone</Label>
                        <Input id="orgPhone" value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} disabled={!isAdmin} onKeyDown={stopEnter} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="orgEmail">Business Email</Label>
                        <Input id="orgEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!isAdmin} onKeyDown={stopEnter} />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="orgBizNumber">Business Number / HST #</Label>
                    <Input id="orgBizNumber" value={businessNumber} onChange={(e) => setBusinessNumber(e.target.value)} disabled={!isAdmin} onKeyDown={stopEnter} />
                </div>
                {!isAdmin && (
                    <p className="flex items-start gap-2 text-xs text-muted-foreground">
                        <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        Only workspace administrators can change the company information.
                    </p>
                )}
            </CardContent>
            {isAdmin && (
                <CardFooter className="flex flex-wrap gap-2 border-t bg-muted/10">
                    <Button type="button" size="sm" onClick={handleSave} disabled={isBusy || !orgId || !isHydrated}>
                        {isBusy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save company information
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}
