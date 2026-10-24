'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Hash, LoaderCircle, Save, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { getOrganization, updateOrganizationDetails } from '@/core/organization-service';
import { resolveOrgId } from '@/services/branding-service';
import { brandingErrorMessage } from '@/lib/branding-utils';
import { getNextDocumentNumbers } from '@/app/actions/numbering-actions';
import {
    DEFAULT_NUMBERING,
    DOCUMENT_NUMBER_TYPES,
    normalizeRule,
    type DocumentNumberType,
    type NumberingConfig,
    type NumberingRule,
} from '@/core/document-numbering';

const PREFIX_RE = /^[A-Za-z0-9][A-Za-z0-9-]{0,15}$/;

const TYPE_LABELS: Record<DocumentNumberType, string> = {
    INV: 'Invoices',
    QTE: 'Quotes',
    REC: 'Receipts',
    WO: 'Work Orders',
};

/**
 * Settings card for document numbering: PREFIX-YYYYMMDD-001 per type.
 * Daily sequences with no annual reset; claims happen server-side at save time
 * (see numbering-actions.ts). Admin-only, saved on the org document.
 */
export function DocumentNumberingCard() {
    const { accessLevel } = useAuth();
    const { toast } = useToast();
    const isAdmin = accessLevel === 'org_admin' || accessLevel === 'super_admin';

    const [orgId, setOrgId] = useState<string | null>(null);
    const [isBusy, setIsBusy] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);
    const [rules, setRules] = useState<Record<DocumentNumberType, NumberingRule>>({ ...DEFAULT_NUMBERING });
    const [previews, setPreviews] = useState<Partial<Record<DocumentNumberType, string>>>({});

    const stopEnter = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') e.preventDefault();
    };

    const loadPreviews = useCallback(async () => {
        try {
            const next = await getNextDocumentNumbers();
            setPreviews(next);
        } catch {
            setPreviews({});
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        resolveOrgId().then((id) => {
            if (cancelled) return;
            setOrgId(id);
            if (id) {
                getOrganization(id)
                    .then((org) => {
                        if (cancelled || !org) return;
                        const next = { ...DEFAULT_NUMBERING } as Record<DocumentNumberType, NumberingRule>;
                        for (const type of DOCUMENT_NUMBER_TYPES) {
                            next[type] = normalizeRule(org.numbering?.[type], DEFAULT_NUMBERING[type]);
                        }
                        setRules(next);
                        setIsHydrated(true);
                    })
                    .catch(() => {});
                void loadPreviews();
            }
        });
        return () => {
            cancelled = true;
        };
    }, [loadPreviews]);

    const setPrefix = (type: DocumentNumberType, prefix: string) =>
        setRules((prev) => ({ ...prev, [type]: { ...prev[type], prefix } }));
    const setPadding = (type: DocumentNumberType, raw: string) =>
        setRules((prev) => ({ ...prev, [type]: { ...prev[type], padding: Number(raw) || 3 } }));

    const handleSave = async () => {
        if (!orgId) return;
        for (const type of DOCUMENT_NUMBER_TYPES) {
            const prefix = rules[type].prefix.trim();
            if (!PREFIX_RE.test(prefix)) {
                toast({
                    variant: 'destructive',
                    title: 'Invalid prefix',
                    description: `${type}: use 1-16 letters, digits or dashes (e.g. ${DEFAULT_NUMBERING[type].prefix}).`,
                });
                return;
            }
        }
        setIsBusy(true);
        try {
            const config: NumberingConfig = {};
            for (const type of DOCUMENT_NUMBER_TYPES) {
                config[type] = normalizeRule(rules[type], DEFAULT_NUMBERING[type]);
            }
            await updateOrganizationDetails(orgId, { numbering: config });
            setRules((prev) => {
                const next = { ...prev };
                for (const type of DOCUMENT_NUMBER_TYPES) {
                    next[type] = normalizeRule(config[type], DEFAULT_NUMBERING[type]);
                }
                return next;
            });
            await loadPreviews();
            toast({
                title: 'Document numbering saved',
                description: 'New documents will use the updated numbering from their next save.',
            });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Could not save numbering', description: brandingErrorMessage(error) });
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <Card>
            <CardHeader className="bg-primary/5 border-b">
                <div className="flex items-center gap-3">
                    <Hash className="h-6 w-6 text-primary" />
                    <CardTitle className="text-base">Document Numbering</CardTitle>
                </div>
                <CardDescription>
                    Numbers follow <span className="font-mono">PREFIX-YYYYMMDD-001</span> with a fresh daily sequence per
                    type &mdash; no annual reset. Editing an exception number is allowed; duplicates in this workspace are
                    rejected when the document saves.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {DOCUMENT_NUMBER_TYPES.map((type) => (
                    <div key={type} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end rounded-md border px-3 py-3">
                        <div className="sm:col-span-4">
                            <Label className="text-sm font-semibold">{TYPE_LABELS[type]}</Label>
                            <p className="text-xs text-muted-foreground">{type} prefix series</p>
                        </div>
                        <div className="sm:col-span-3">
                            <Label htmlFor={`prefix-${type}`}>Prefix</Label>
                            <Input
                                id={`prefix-${type}`}
                                value={rules[type].prefix}
                                maxLength={16}
                                onChange={(e) => setPrefix(type, e.target.value)}
                                disabled={!isAdmin}
                                onKeyDown={stopEnter}
                                className="font-mono"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <Label htmlFor={`padding-${type}`}>Digits</Label>
                            <Input
                                id={`padding-${type}`}
                                type="number"
                                min={3}
                                max={6}
                                value={rules[type].padding}
                                onChange={(e) => setPadding(type, e.target.value)}
                                disabled={!isAdmin}
                                onKeyDown={stopEnter}
                            />
                        </div>
                        <div className="sm:col-span-3">
                            <Label>Next number today</Label>
                            <p className="font-mono text-sm text-primary truncate">{previews[type] || '—'}</p>
                        </div>
                    </div>
                ))}
                {!isAdmin && (
                    <p className="flex items-start gap-2 text-xs text-muted-foreground">
                        <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        Only workspace administrators can change document numbering.
                    </p>
                )}
            </CardContent>
            {isAdmin && (
                <CardFooter className="flex flex-wrap gap-2 border-t bg-muted/10">
                    <Button type="button" size="sm" onClick={handleSave} disabled={isBusy || !orgId || !isHydrated}>
                        {isBusy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save numbering settings
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}