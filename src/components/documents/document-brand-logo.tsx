'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/logo';
import { useAuth } from '@/context/auth-context';
import { resolveOrgId, subscribeToOrgBranding } from '@/services/branding-service';

interface DocumentBrandLogoProps {
    className?: string;
}

/**
 * The logo shown in the header of printable documents (quotes, invoices,
 * invoice previews and receipts). Renders the workspace's custom logo when one
 * has been uploaded in Settings > Document Logo, and falls back to the Ogeemo
 * logo otherwise (including when the custom image fails to load). Display
 * only: the logo is uploaded from Settings > Document Logo, so there is no
 * inline picker on the document itself. Self contained: callers only replace
 * the old <Logo /> with <DocumentBrandLogo />.
 */
export function DocumentBrandLogo({ className }: DocumentBrandLogoProps) {
    const { user } = useAuth();

    const [orgId, setOrgId] = useState<string | null>(null);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [hasFailed, setHasFailed] = useState(false);

    // Resolve the workspace only once auth state is known: getCurrentOrgId()
    // reads the signed-in user's claims/profile, so resolving before auth has
    // finished can return null permanently and pin the fallback logo.
    useEffect(() => {
        if (!user) {
            setOrgId(null);
            return;
        }
        let cancelled = false;
        resolveOrgId().then((id) => {
            if (!cancelled) setOrgId(id);
        });
        return () => {
            cancelled = true;
        };
    }, [user]);

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

    return <Logo className={cn('text-primary', className)} />;
}
