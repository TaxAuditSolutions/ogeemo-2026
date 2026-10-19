'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { ImageUp, LoaderCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { resolveOrgId, subscribeToOrgBranding, uploadOrgLogo } from '@/services/branding-service';
import { ALLOWED_LOGO_TYPES, brandingErrorMessage } from '@/lib/branding-utils';

interface DocumentBrandLogoProps {
    className?: string;
}

/**
 * The logo shown in the header of printable documents (quotes, invoices,
 * invoice previews and receipts). Renders the workspace's custom logo when one
 * has been uploaded in Settings > Document Logo, and falls back to the Ogeemo
 * logo otherwise (including when the custom image fails to load). While the
 * fallback is showing, admins also get an inline "Select logo" button that
 * uploads without leaving the document; it never reaches printouts
 * (print:hidden covers window.print(); data-no-print covers useReactToPrint's
 * DOM clone). Self contained: callers only replace the old <Logo /> with
 * <DocumentBrandLogo />.
 */
export function DocumentBrandLogo({ className }: DocumentBrandLogoProps) {
    const { accessLevel } = useAuth();
    const { toast } = useToast();
    // Firestore rules only allow admins to save branding - mirror that here.
    const isAdmin = accessLevel === 'org_admin' || accessLevel === 'super_admin';

    const [orgId, setOrgId] = useState<string | null>(null);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [hasFailed, setHasFailed] = useState(false);
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
                (branding) => {
                    setLogoUrl(branding.logoUrl);
                    setHasFailed(false);
                },
                () => {
                    // Branding unavailable (e.g. no workspace) - keep the fallback.
                }
            );
        } catch {
            // Firebase unavailable during prerender - keep the fallback.
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

    // While the fallback logo is showing, admins get an inline picker so a
    // logo can be chosen without leaving the document. The button (and its
    // file input) must never appear on a printout: print:hidden handles
    // window.print() (invoice preview page), data-no-print handles
    // useReactToPrint's DOM-clone path (quote/invoice generators, receipt).
    const logoPicker = isAdmin && (
        <>
            <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_LOGO_TYPES.join(',')}
                className="hidden print:hidden"
                data-no-print
                onChange={handleFileSelected}
            />
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isBusy || !orgId}
                className="print:hidden"
                data-no-print
            >
                {isBusy ? (
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <ImageUp className="mr-2 h-4 w-4" />
                )}
                Select logo
            </Button>
        </>
    );

    if (logoUrl && !hasFailed) {
        return (
            // Plain <img>: the URL is a Firebase Storage download link (external
            // host), which next/image would reject without remote-pattern config.
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={logoUrl}
                alt="Company logo"
                className={cn('h-16 w-auto max-w-[3in] object-contain', className)}
                onError={() => setHasFailed(true)}
            />
        );
    }

    return (
        <span className="inline-flex items-center gap-2">
            <Logo className={cn('text-primary', className)} />
            {logoPicker}
        </span>
    );
}
