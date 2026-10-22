'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ImageUp, LoaderCircle, ShieldCheck, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { removeOrgLogo, resolveOrgId, subscribeToOrgBranding, uploadOrgLogo } from '@/services/branding-service';
import { brandingErrorMessage } from '@/lib/branding-utils';

/**
 * Settings card for the workspace document logo: uploaded once, it appears in
 * the header of every printable form (quotes, invoices, invoice previews and
 * receipts) for everyone in the workspace. Firestore rules restrict saving to
 * org admins; viewers/editors see a read-only preview.
 */
export function DocumentBrandingCard() {
    const { accessLevel } = useAuth();
    const { toast } = useToast();
    const isAdmin = accessLevel === 'org_admin' || accessLevel === 'super_admin';

    const [orgId, setOrgId] = useState<string | null>(null);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [isBusy, setIsBusy] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        let unsubscribe: (() => void) | undefined;
        try {
            unsubscribe = subscribeToOrgBranding(
                orgId,
                (branding) => setLogoUrl(branding.logoUrl),
                () => {
                    // Branding unavailable - preview stays on the default logo.
                }
            );
        } catch {
            // Firebase unavailable during prerender.
        }
        return () => unsubscribe?.();
    }, [orgId]);

    const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file || !orgId) return;
        setIsBusy(true);
        try {
            await uploadOrgLogo(orgId, file);
            toast({
                title: 'Logo saved',
                description: 'Your logo now appears on quotes, invoices and receipts for everyone in this workspace.',
            });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Upload failed', description: brandingErrorMessage(error) });
        } finally {
            setIsBusy(false);
        }
    };

    const handleRemove = async () => {
        if (!orgId) return;
        setIsBusy(true);
        try {
            await removeOrgLogo(orgId);
            toast({ title: 'Logo removed', description: 'Documents now show the default Ogeemo logo.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Could not remove logo', description: brandingErrorMessage(error) });
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <Card>
            <CardHeader className="bg-primary/5 border-b">
                <div className="flex items-center gap-3">
                    <ImageUp className="h-6 w-6 text-primary" />
                    <CardTitle className="text-base">Document Logo</CardTitle>
                </div>
                <CardDescription>
                    Brand your quotes, invoices and receipts. Your logo appears in the header of every printed document
                    for everyone in this workspace.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-center h-28 rounded-lg border border-dashed bg-white p-2">
                    {logoUrl ? (
                        // External Firebase Storage URL - plain <img> avoids next/image remote-pattern config.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={logoUrl}
                            alt="Current document logo"
                            className="h-24 w-auto max-w-full object-contain"
                        />
                    ) : (
                        <span className="text-xs text-muted-foreground text-center px-4">
                            No custom logo yet - documents show the default Ogeemo logo.
                        </span>
                    )}
                </div>
                {!isAdmin && (
                    <p className="flex items-start gap-2 text-xs text-muted-foreground">
                        <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        Only workspace administrators can change the logo. Ask an admin if you would like a different one.
                    </p>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={handleFileSelected}
                />
            </CardContent>
            {isAdmin && (
                <CardFooter className="flex flex-wrap gap-2 border-t bg-muted/10">
                    <Button type="button" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isBusy || !orgId}>
                        {isBusy ? (
                            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <ImageUp className="mr-2 h-4 w-4" />
                        )}
                        {logoUrl ? 'Replace logo' : 'Upload logo'}
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleRemove}
                        disabled={isBusy || !logoUrl}
                    >
                        <Trash2 className="mr-2 h-4 w-4" /> Remove
                    </Button>
                    <span className="ml-auto text-[10px] uppercase tracking-widest text-muted-foreground self-center">
                        PNG, JPEG, WebP or GIF - max 5 MB
                    </span>
                </CardFooter>
            )}
        </Card>
    );
}

