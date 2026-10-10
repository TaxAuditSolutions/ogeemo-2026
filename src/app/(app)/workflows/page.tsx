'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Check,
    Inbox,
    LayoutGrid,
    LayoutTemplate,
    LoaderCircle,
    Plus,
    Save,
    Search,
    Trash2,
    Workflow as WorkflowIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { getUserWorkflows, saveUserWorkflows, type Workflow, type WorkflowItem } from '@/services/workflow-service';
import { allMenuItems, type MenuItem } from '@/lib/menu-items';
import { groupedMenuItems } from '@/components/layout/main-menu';
import { ActionChip } from '@/components/dashboard/ActionChip';
import { ChipDropZone } from '@/components/dashboard/ChipDropZone';
import { type ActionChipData } from '@/types/calendar-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { WORKFLOW_TEMPLATES, applyWorkflowTemplate, type WorkflowTemplate } from '@/lib/workflow-templates';

/**
 * Workflows: named, user-authored sets of destinations (e.g. "Bookkeeping",
 * "Quotes") - beta feedback on workflow customization.
 *
 * A workflow can be APPLIED to the sidebar: the Workspace group then shows
 * that workflow's destinations (resolution/fallbacks in
 * src/lib/workspace-workflow.ts; the default five remain untouched until a
 * workflow is applied, and one click restores them). Coordination: OG-035.
 *
 * Shipped templates (Accountant, Lawyer) live in src/lib/workflow-templates.ts
 * and arrive via the Template Workflows menu - copied into the user's list,
 * never applied implicitly.
 */

const OTHER_GROUP = 'Other Destinations';

const chipHrefPath = (href: ActionChipData['href']): string =>
    typeof href === 'string' ? href : (href?.pathname ?? '');

const menuItemToChip = (item: MenuItem): ActionChipData => ({
    id: `menu-${item.href}`,
    label: item.label,
    icon: item.icon,
    href: item.href,
    userId: '',
});

const chipToWorkflowItem = (chip: ActionChipData): WorkflowItem => ({
    id: chip.id,
    label: chip.label,
    href: chipHrefPath(chip.href),
});

const workflowItemToChip = (item: WorkflowItem): ActionChipData => ({
    id: item.id,
    label: item.label,
    icon: allMenuItems.find((m) => m.href === item.href)?.icon ?? Inbox,
    href: item.href,
    userId: '',
});

function StepTile({ step, item }: { step: number; item: WorkflowItem }) {
    const router = useRouter();
    const Icon = allMenuItems.find((m) => m.href === item.href)?.icon ?? Inbox;
    return (
        <button
            type="button"
            onClick={() => router.push(item.href)}
            className="flex items-center gap-3 rounded-lg border bg-card p-3 text-left shadow-sm transition-colors hover:border-primary hover:bg-primary/5"
        >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {step}
            </span>
            <span className="flex min-w-0 items-center gap-2">
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm font-medium">{item.label}</span>
            </span>
        </button>
    );
}

/**
 * Dropdown of shipped role templates. Picking one copies it into the user's
 * list (direct add - it stays fully editable and is never auto-applied).
 */
function TemplateWorkflowsButton({ onSelect }: { onSelect: (template: WorkflowTemplate) => void }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline">
                    <LayoutTemplate className="mr-2 h-4 w-4" /> Template Workflows
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Start from a template</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {WORKFLOW_TEMPLATES.map((template) => (
                    <DropdownMenuItem key={template.name} onSelect={() => onSelect(template)}>
                        <div className="flex w-full flex-col gap-0.5">
                            <span className="font-medium">{template.name}</span>
                            <span className="text-xs text-muted-foreground">
                                {template.blurb} ({template.items.length} steps)
                            </span>
                        </div>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default function WorkflowsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const { preferences, updatePreferences } = useUserPreferences();

    const [workflows, setWorkflows] = React.useState<Workflow[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [view, setView] = React.useState<{ mode: 'list' } | { mode: 'run' | 'edit'; id: string }>({ mode: 'list' });
    const [showCreate, setShowCreate] = React.useState(false);
    const [newName, setNewName] = React.useState('');
    const [draftName, setDraftName] = React.useState('');
    const [draftItems, setDraftItems] = React.useState<WorkflowItem[]>([]);
    const [paletteSearch, setPaletteSearch] = React.useState('');
    const [deleteTarget, setDeleteTarget] = React.useState<Workflow | null>(null);

    const activeId: string | null = preferences?.activeWorkflowId ?? null;

    const load = React.useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            setWorkflows(await getUserWorkflows(user.uid));
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to load workflows', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    React.useEffect(() => {
        void load();
    }, [load]);

    const persist = async (next: Workflow[]) => {
        if (!user) return;
        await saveUserWorkflows(user.uid, next);
        setWorkflows(next);
        // The sidebar listens for this to re-resolve its Workspace items.
        window.dispatchEvent(new Event('workflowsUpdated'));
    };

    const handleApply = async (id: string) => {
        await updatePreferences({ activeWorkflowId: id });
        window.dispatchEvent(new Event('workflowsUpdated'));
        toast({ title: 'Workflow applied to sidebar', description: 'The sidebar Workspace group now follows this workflow.' });
    };

    const handleRestore = async () => {
        await updatePreferences({ activeWorkflowId: null });
        window.dispatchEvent(new Event('workflowsUpdated'));
        toast({ title: 'Default Workspace restored' });
    };

    const handleCreate = async () => {
        const name = newName.trim();
        if (!name) {
            toast({ variant: 'destructive', title: 'Name required', description: 'Give the workflow a name (e.g. Bookkeeping).' });
            return;
        }
        const wf: Workflow = {
            id: `wf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
            name,
            items: [],
        };
        try {
            await persist([...workflows, wf]);
            setNewName('');
            setShowCreate(false);
            setDraftName(wf.name);
            setDraftItems([]);
            setView({ mode: 'edit', id: wf.id });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to create workflow', description: error.message });
        }
    };

    const handleAddTemplate = async (template: WorkflowTemplate) => {
        const result = applyWorkflowTemplate(workflows, template, () =>
            `wf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        );
        if (result.status === 'duplicate') {
            toast({
                title: 'Already in your workflows',
                description: `"${template.name}" is in your list - open it there to edit or rename it.`,
            });
            return;
        }
        try {
            await persist([...result.workflows]);
            toast({
                title: `Template "${template.name}" added`,
                description: 'Open it to review the steps, or apply it to the sidebar.',
            });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to add template', description: error.message });
        }
    };

    const openEdit = (wf: Workflow) => {
        setDraftName(wf.name);
        setDraftItems([...wf.items]);
        setView({ mode: 'edit', id: wf.id });
    };

    const handleSaveDraft = async () => {
        if (view.mode !== 'edit') return;
        const name = draftName.trim();
        if (!name) {
            toast({ variant: 'destructive', title: 'Name required', description: 'The workflow needs a name.' });
            return;
        }
        try {
            const next = workflows.map((w) =>
                w.id === view.id ? { ...w, name, items: draftItems, updatedAt: new Date() } : w,
            );
            await persist(next);
            toast({ title: 'Workflow saved' });
            setView({ mode: 'list' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to save workflow', description: error.message });
        }
    };

    const leaveEdit = () => {
        if (view.mode !== 'edit') return;
        const wf = workflows.find((w) => w.id === view.id);
        const dirty = wf && (wf.name !== draftName.trim() || JSON.stringify(wf.items) !== JSON.stringify(draftItems));
        if (dirty && !window.confirm('Discard unsaved changes?')) return;
        setView({ mode: 'list' });
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            const next = workflows.filter((w) => w.id !== deleteTarget.id);
            await persist(next);
            if (activeId === deleteTarget.id) {
                await updatePreferences({ activeWorkflowId: null });
                window.dispatchEvent(new Event('workflowsUpdated'));
            }
            if (view.mode !== 'list' && view.id === deleteTarget.id) setView({ mode: 'list' });
            setDeleteTarget(null);
            toast({ title: 'Workflow deleted' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to delete workflow', description: error.message });
        }
    };

    const addToDraft = (chip: ActionChipData) => {
        if (draftItems.some((i) => i.id === chip.id)) return;
        setDraftItems((prev) => [...prev, chipToWorkflowItem(chip)]);
    };

    const removeFromDraft = (id: string) => setDraftItems((prev) => prev.filter((i) => i.id !== id));

    const moveInDraft = (dragIndex: number, hoverIndex: number) =>
        setDraftItems((prev) => {
            const next = [...prev];
            const [moved] = next.splice(dragIndex, 1);
            next.splice(hoverIndex, 0, moved);
            return next;
        });

    const groupNameByHref = React.useMemo(() => {
        const map = new Map<string, string>();
        for (const [name, def] of Object.entries(groupedMenuItems)) {
            if (def.masterTenantOnly) continue;
            for (const href of def.items) map.set(href, name); // last wins (dedupes /accounting into Accounting)
        }
        return map;
    }, []);

    const paletteGroups = React.useMemo(() => {
        const query = paletteSearch.trim().toLowerCase();
        const added = new Set(draftItems.map((i) => i.href));
        const buckets = new Map<string, ActionChipData[]>();
        for (const item of allMenuItems) {
            // Palette = core destinations: skip admin/owner-only entries (the
            // sidebar hides those by role and they'd become dead steps).
            if (item.adminOnly || item.masterTenantOnly) continue;
            if (added.has(item.href)) continue;
            if (query && !item.label.toLowerCase().includes(query)) continue;
            const groupName = groupNameByHref.get(item.href) ?? OTHER_GROUP;
            const bucket = buckets.get(groupName) ?? [];
            bucket.push(menuItemToChip(item));
            buckets.set(groupName, bucket);
        }
        const order = [
            ...Object.entries(groupedMenuItems)
                .filter(([, def]) => !def.masterTenantOnly)
                .map(([name]) => name),
            OTHER_GROUP,
        ];
        const iconFor = (name: string): LucideIcon =>
            name === OTHER_GROUP
                ? LayoutGrid
                : ((groupedMenuItems[name]?.icon as LucideIcon | undefined) ?? LayoutGrid);
        return order
            .filter((name) => buckets.has(name))
            .map((name) => ({ name, icon: iconFor(name), chips: buckets.get(name)! }));
    }, [paletteSearch, draftItems, groupNameByHref]);

    const current = view.mode === 'list' ? null : workflows.find((w) => w.id === view.id) ?? null;

    if (isLoading) {
        return (
            <div className="p-10 flex justify-center text-black">
                <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 space-y-6 text-black">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline text-primary flex items-center gap-2">
                        <WorkflowIcon className="h-7 w-7" /> Workflows
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Named, ordered sets of destinations - e.g. Bookkeeping, Quotes. Apply one to make the
                        sidebar&apos;s Workspace group follow it; the default is always one click away.
                    </p>
                </div>
                {view.mode === 'list' ? (
                    <div className="flex flex-wrap items-center gap-2">
                        <TemplateWorkflowsButton onSelect={(t) => void handleAddTemplate(t)} />
                        <Button onClick={() => setShowCreate((v) => !v)}>
                            <Plus className="mr-2 h-4 w-4" /> New Workflow
                        </Button>
                    </div>
                ) : (
                    <Button variant="outline" onClick={() => (view.mode === 'edit' ? leaveEdit() : setView({ mode: 'list' }))}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                )}
            </header>

            {view.mode === 'list' && (
                <>
                    {showCreate && (
                        <Card>
                            <CardContent className="p-4 flex flex-wrap gap-2">
                                <Input
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            void handleCreate();
                                        }
                                    }}
                                    placeholder="Workflow name (e.g. Bookkeeping)"
                                    className="flex-1 min-w-[220px]"
                                />
                                <Button onClick={() => void handleCreate()} disabled={!newName.trim()}>
                                    Create
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {activeId && (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
                            <span>
                                Sidebar is showing:{' '}
                                <strong>{workflows.find((w) => w.id === activeId)?.name ?? 'a deleted workflow'}</strong>
                            </span>
                            <Button variant="outline" size="sm" onClick={() => void handleRestore()}>
                                Restore default Workspace
                            </Button>
                        </div>
                    )}
                    {workflows.length === 0 ? (
                        <Card>
                            <CardContent className="p-10 text-center text-muted-foreground space-y-3">
                                <WorkflowIcon className="mx-auto h-10 w-10" />
                                <p>No workflows yet. Start from a template or create one to group the destinations of a way of working.</p>
                                <div className="flex flex-wrap items-center justify-center gap-2">
                                    <TemplateWorkflowsButton onSelect={(t) => void handleAddTemplate(t)} />
                                    <Button onClick={() => setShowCreate(true)}>
                                        <Plus className="mr-2 h-4 w-4" /> Create your first workflow
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {workflows.map((wf) => (
                                <Card key={wf.id}>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="flex items-center justify-between gap-2 text-lg">
                                            <span className="truncate">{wf.name}</span>
                                            {wf.id === activeId && (
                                                <span className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
                                                    <Check className="h-3 w-3" /> Active
                                                </span>
                                            )}
                                        </CardTitle>
                                        <CardDescription>
                                            {wf.items.length} {wf.items.length === 1 ? 'step' : 'steps'}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex flex-wrap gap-2">
                                        <Button size="sm" onClick={() => setView({ mode: 'run', id: wf.id })}>
                                            Open
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => openEdit(wf)}>
                                            Edit
                                        </Button>
                                        {wf.id === activeId ? (
                                            <Button size="sm" variant="outline" onClick={() => void handleRestore()}>
                                                Restore default
                                            </Button>
                                        ) : (
                                            <Button size="sm" variant="secondary" onClick={() => void handleApply(wf.id)}>
                                                Apply to sidebar
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-destructive"
                                            onClick={() => setDeleteTarget(wf)}
                                            aria-label={`Delete ${wf.name}`}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </>
            )}
            {view.mode === 'run' && current && (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-semibold">{current.name}</span>
                        {current.id === activeId ? (
                            <span className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
                                <Check className="h-3 w-3" /> Applied to sidebar
                            </span>
                        ) : (
                            <Button size="sm" variant="secondary" onClick={() => void handleApply(current.id)}>
                                Apply to sidebar
                            </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => openEdit(current)}>
                            Edit steps
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget(current)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </Button>
                    </div>
                    {current.items.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No steps yet - edit the workflow to add destinations.</p>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            {current.items.map((item, idx) => (
                                <StepTile key={`${item.id}-${idx}`} step={idx + 1} item={item} />
                            ))}
                        </div>
                    )}
                </div>
            )}
            {view.mode === 'edit' && current && (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Input
                            value={draftName}
                            onChange={(e) => setDraftName(e.target.value)}
                            placeholder="Workflow name"
                            className="flex-1 min-w-[200px]"
                        />
                        <Button onClick={() => void handleSaveDraft()}>
                            <Save className="mr-2 h-4 w-4" /> Save
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">Workflow steps ({draftItems.length})</CardTitle>
                                <CardDescription>
                                    Drag to reorder. Drag a step back to the palette (or use its menu) to remove it.
                                </CardDescription>
                            </CardHeader>
                            <ChipDropZone
                                className="min-h-[140px] rounded-b-xl"
                                onDrop={(item) => {
                                    if (!draftItems.some((i) => i.id === item.id)) addToDraft(item);
                                }}
                                onMove={moveInDraft}
                            >
                                {draftItems.map((item, idx) => (
                                    <ActionChip
                                        key={item.id}
                                        chip={workflowItemToChip(item)}
                                        index={idx}
                                        onDelete={() => removeFromDraft(item.id)}
                                        onChipClick={() => undefined}
                                    />
                                ))}
                                {draftItems.length === 0 && (
                                    <p className="w-full text-sm text-muted-foreground">
                                        Drag destinations here - or click them in the palette.
                                    </p>
                                )}
                            </ChipDropZone>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">Destinations</CardTitle>
                                <CardDescription>Drag into the workflow - or click to add.</CardDescription>
                                <div className="relative mt-1">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        value={paletteSearch}
                                        onChange={(e) => setPaletteSearch(e.target.value)}
                                        placeholder="Search destinations..."
                                        className="pl-8"
                                    />
                                </div>
                            </CardHeader>
                            <div className="max-h-[420px] overflow-y-auto px-4 pb-4 space-y-4">
                                {paletteGroups.map((group) => (
                                    <div key={group.name}>
                                        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            <group.icon className="h-3.5 w-3.5" /> {group.name}
                                        </div>
                                        <ChipDropZone
                                            className="rounded-lg border border-dashed"
                                            onDrop={(item) => {
                                                if (draftItems.some((i) => i.id === item.id)) removeFromDraft(item.id);
                                            }}
                                        >
                                            {group.chips.map((chip, idx) => (
                                                <ActionChip
                                                    key={chip.id}
                                                    chip={chip}
                                                    index={idx}
                                                    onChipClick={() => addToDraft(chip)}
                                                />
                                            ))}
                                        </ChipDropZone>
                                    </div>
                                ))}
                                {paletteGroups.length === 0 && (
                                    <p className="text-sm text-muted-foreground">No destinations match.</p>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            )}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
                        <AlertDialogDescription>
                            The workflow and its steps will be removed. If it is applied to the sidebar, the default
                            Workspace returns.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={() => void handleConfirmDelete()}>
                            Delete
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}








