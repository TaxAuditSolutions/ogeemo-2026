'use client';

import * as React from 'react';
import Link from 'next/link';
import { useDrop } from 'react-dnd';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoaderCircle, Plus, ArrowLeft, Trash2, ArrowDownAZ, ArrowUpZA, Save, BookOpen, Zap, Search, X, Wand2, LayoutGrid } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import {
  getActionChips,
  getAvailableActionChips,
  updateActionChips,
  updateAvailableActionChips,
  trashActionChips,
  updateActionChip,
  type ActionChipData,
  addActionChip,
} from '@/services/project-service';
import { ActionChip, DraggableItemTypes } from './ActionChip';
import { ChipDropZone } from './ChipDropZone';
import AddActionDialog from './AddActionDialog';
import { groupedMenuItems } from '@/components/layout/main-menu';
import { cn } from '@/lib/utils';

const TrashDropZone = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: DraggableItemTypes.ACTION_CHIP,
    drop: async (item: ActionChipData & { index: number }) => {
      if (!user) return;
      try {
        await trashActionChips(user.uid, [item]);
        toast({
          title: 'Action Trashed',
          description: `"${item.label}" has been moved to the trash.`,
          action: <Button variant="link" asChild><Link href="/action-manager/trash">View Trash</Link></Button>,
        });
        window.dispatchEvent(new Event('chipsUpdated'));
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Failed to trash action', description: error.message });
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  return (
    <div className="w-full flex justify-start">
        <Link href="/action-manager/trash" className="w-full md:w-1/4">
        <div
            ref={(node) => { drop(node); }}
            className={cn(
            'mt-6 flex items-center justify-start gap-4 rounded-lg border-2 border-dashed p-4 text-muted-foreground transition-colors',
            isOver && canDrop ? 'border-destructive bg-destructive/10 text-destructive' : 'hover:border-muted-foreground/50'
            )}
        >
            <Trash2 className="h-6 w-6" />
            <p>Drag here to trash</p>
        </div>
        </Link>
    </div>
  );
};


/**
 * Grouping for the "Available Actions" panel (beta feedback: the panel is an
 * undifferentiated wall of small buttons).
 *
 * Group headers are ALWAYS-VISIBLE plain dividers — nothing collapses, so the
 * full inventory stays on screen (explicit product decision: grouping must
 * never hide options).
 *
 * Membership is derived at render time from the sidebar's `groupedMenuItems`,
 * plus prefix rules for menu hrefs the sidebar groups don't enumerate (the 20+
 * uncovered /accounting/* pages would otherwise land in a huge "Other" pile).
 * No Firestore schema change is involved.
 */
type ChipGroup = { name: string; icon: LucideIcon; chips: ActionChipData[] };

const CUSTOM_CHIPS_GROUP = 'Your Custom Actions';
const OTHER_CHIPS_GROUP = 'Other Actions';

const sidebarGroups: Array<{ name: string; icon: LucideIcon; items: string[] }> =
  Object.entries(groupedMenuItems).map(([name, def]) => ({
    name,
    icon: def.icon as LucideIcon,
    items: def.items,
  }));

// Exact-href → group. Later entries win, so /accounting resolves to the
// "Accounting" group rather than the sidebar's duplicate in "Operations".
const exactGroupByHref = new Map<string, string>();
for (const { name, items } of sidebarGroups) {
  for (const href of items) {
    exactGroupByHref.set(href, name);
  }
}

const PREFIX_GROUP_RULES: Array<[prefix: string, group: string]> = [
  ['/accounting', 'Accounting'],
  ['/action-manager', 'Workspace'],
  ['/hr-manager', 'Administration'],
  ['/field-app', 'Administration'],
  ['/settings', 'Administration'],
  ['/inventory-manager', 'Operations'],
  ['/inquiries', 'Relationships'],
];

const chipHrefRaw = (chip: ActionChipData): string =>
  typeof chip.href === 'string' ? chip.href : (chip.href?.pathname ?? '');

const chipPathname = (chip: ActionChipData): string => {
  const raw = chipHrefRaw(chip);
  if (/^https?:\/\//i.test(raw)) return raw;
  return raw.split('?')[0].split('#')[0];
};

const resolveChipGroup = (chip: ActionChipData): string => {
  const raw = chipHrefRaw(chip);
  // User-created chips (and external-link chips) always surface first, under
  // their own heading, so they stay easy to find.
  if (chip.id?.startsWith('custom-') || /^https?:\/\//i.test(raw)) {
    return CUSTOM_CHIPS_GROUP;
  }
  const path = chipPathname(chip);
  const exact = exactGroupByHref.get(path);
  if (exact) return exact;
  for (const [prefix, group] of PREFIX_GROUP_RULES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return group;
  }
  return OTHER_CHIPS_GROUP;
};

const groupAvailableChips = (chips: ActionChipData[]): ChipGroup[] => {
  const buckets = new Map<string, ActionChipData[]>();
  for (const chip of chips) {
    const name = resolveChipGroup(chip);
    const bucket = buckets.get(name);
    if (bucket) bucket.push(chip);
    else buckets.set(name, [chip]);
  }

  const groupIcon = (name: string): LucideIcon => {
    if (name === CUSTOM_CHIPS_GROUP) return Wand2;
    if (name === OTHER_CHIPS_GROUP) return LayoutGrid;
    return sidebarGroups.find((g) => g.name === name)?.icon ?? LayoutGrid;
  };

  // Custom first (user's own work), then sidebar order, "Other" last.
  // Empty groups are dropped (e.g. after search filtering).
  const order = [CUSTOM_CHIPS_GROUP, ...sidebarGroups.map((g) => g.name), OTHER_CHIPS_GROUP];
  return order
    .filter((name) => buckets.has(name))
    .map((name) => ({ name, icon: groupIcon(name), chips: buckets.get(name)! }));
};

export function ManageDashboardView() {
  const [chipsState, setChipsState] = React.useState<{
    userChips: ActionChipData[];
    availableChips: ActionChipData[];
  }>({
    userChips: [],
    availableChips: [],
  });
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAddActionDialogOpen, setIsAddActionDialogOpen] = React.useState(false);
  const [chipToEdit, setChipToEdit] = React.useState<ActionChipData | null>(null);
  const [availableSearch, setAvailableSearch] = React.useState('');

  const { user } = useAuth();
  const { toast } = useToast();

  const loadChips = React.useCallback(async () => {
    if (user) {
      setIsLoading(true);
      try {
        const [userChips, availableChips] = await Promise.all([
          getActionChips(user.uid),
          getAvailableActionChips(user.uid),
        ]);
        setChipsState({ userChips, availableChips });
      } catch (error) {
        console.error("Failed to load chips:", error);
        toast({
          variant: 'destructive',
          title: 'Failed to load actions',
          description: error instanceof Error ? error.message : 'An unknown error occurred.',
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [user, toast]);

  React.useEffect(() => {
    loadChips();
    
    const handleChipsUpdate = () => loadChips();
    window.addEventListener('chipsUpdated', handleChipsUpdate);
    return () => window.removeEventListener('chipsUpdated', handleChipsUpdate);
  }, [loadChips]);

  const totalAvailableCount = React.useMemo(
    () => chipsState.availableChips.filter(Boolean).length,
    [chipsState.availableChips],
  );

  const filteredAvailableChips = React.useMemo(() => {
    const chips = chipsState.availableChips.filter(Boolean);
    const query = availableSearch.trim().toLowerCase();
    return query ? chips.filter((chip) => chip.label.toLowerCase().includes(query)) : chips;
  }, [chipsState.availableChips, availableSearch]);

  const availableGroups = React.useMemo(
    () => groupAvailableChips(filteredAvailableChips),
    [filteredAvailableChips],
  );

  const handleStateUpdate = React.useCallback(async (
    newUserChips: ActionChipData[],
    newAvailableChips: ActionChipData[],
  ) => {
    setChipsState({ userChips: newUserChips, availableChips: newAvailableChips });
    if (user) {
      await updateActionChips(user.uid, newUserChips);
      await updateAvailableActionChips(user.uid, newAvailableChips);
      window.dispatchEvent(new Event('chipsUpdated'));
    }
  }, [user]);

  const handleMoveUserChip = React.useCallback((dragIndex: number, hoverIndex: number) => {
    setChipsState(prevState => {
      const newUserChips = [...prevState.userChips];
      const [draggedItem] = newUserChips.splice(dragIndex, 1);
      newUserChips.splice(hoverIndex, 0, draggedItem);
      return { ...prevState, userChips: newUserChips };
    });
  }, []);

  const handleDrop = React.useCallback((item: ActionChipData & { index: number }, target: 'user' | 'available') => {
    setChipsState(prevState => {
      const sourceListKey = (prevState.userChips || []).some(c => c && c.id === item.id) ? 'userChips' : 'availableChips';
      const targetListKey = target === 'user' ? 'userChips' : 'availableChips';

      if (sourceListKey === targetListKey) {
        return prevState;
      }
      
      const sourceList = [...(prevState[sourceListKey] || [])];
      const targetList = [...(prevState[targetListKey] || [])];
      
      const movedItem = sourceList.find(c => c && c.id === item.id);
      if (!movedItem) return prevState;

      const newSourceList = sourceList.filter(c => c && c.id !== item.id);
      const newTargetList = [...targetList, movedItem];

      const newUserChips = targetListKey === 'userChips' ? newTargetList : newSourceList;
      const newAvailableChips = targetListKey === 'availableChips' ? newTargetList : newSourceList;
      
      handleStateUpdate(newUserChips, newAvailableChips);

      return { userChips: newUserChips, availableChips: newAvailableChips };
    });
  }, [handleStateUpdate]);

  const handleActionAdded = () => {
    loadChips();
    window.dispatchEvent(new Event('chipsUpdated'));
  };
  
  const handleActionEdited = (editedChip: ActionChipData) => {
      setChipsState(prevState => ({
          userChips: prevState.userChips.map(c => c.id === editedChip.id ? editedChip : c),
          availableChips: prevState.availableChips.map(c => c.id === editedChip.id ? editedChip : c),
      }));
      window.dispatchEvent(new Event('chipsUpdated'));
  };

  const handleTrashChip = async (chipToTrash: ActionChipData) => {
    if (!user) return;
    try {
      await trashActionChips(user.uid, [chipToTrash]);
      toast({
        title: 'Action Trashed',
        description: `"${chipToTrash.label}" has been moved to the trash.`,
        action: <Button variant="link" asChild><Link href="/action-manager/trash">View Trash</Link></Button>,
      });
      loadChips();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to trash action', description: error.message });
    }
  };
  
  const handleEditChip = (chipToEdit: ActionChipData) => {
    setChipToEdit(chipToEdit);
    setIsAddActionDialogOpen(true);
  };
  
  const handleAddNewChip = () => {
    setChipToEdit(null);
    setIsAddActionDialogOpen(true);
  };

  const handleSortUserChips = (direction: 'asc' | 'desc') => {
    setChipsState(prevState => {
      const sortedChips = [...prevState.userChips].sort((a, b) => {
        return direction === 'asc'
          ? a.label.localeCompare(b.label)
          : b.label.localeCompare(a.label);
      });
      return { ...prevState, userChips: sortedChips };
    });
  };

  const handleSortAvailableChips = (direction: 'asc' | 'desc') => {
    setChipsState(prevState => {
      const sortedChips = [...prevState.availableChips].sort((a, b) => {
        return direction === 'asc'
          ? a.label.localeCompare(b.label)
          : b.label.localeCompare(a.label);
      });
      return { ...prevState, availableChips: sortedChips };
    });
  };

  const handleSaveUserChipOrder = async () => {
    if (!user) return;
    try {
      await updateActionChips(user.uid, chipsState.userChips);
      await updateAvailableActionChips(user.uid, chipsState.availableChips);
      window.dispatchEvent(new Event('chipsUpdated'));
      toast({
        title: "Dashboard Order Saved",
        description: "Your new dashboard layout has been saved.",
      });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6">
        <header className="flex items-center justify-between">
            <div className="text-center flex-1">
                <h1 className="text-2xl font-bold font-headline text-primary">Action Manager Settings</h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                    Drag and drop actions to customize your dashboard.
                </p>
            </div>
            <div className="flex items-center gap-2">
                <Button asChild variant="outline" className="h-6 px-2 py-1 text-xs">
                    <Link href="/action-chips-info">
                        <Zap className="mr-2 h-4 w-4 text-primary" /> Action Chip Magic
                    </Link>
                </Button>
                <Button asChild className="h-6 px-2 py-1 text-xs">
                    <Link href="/action-manager/manage/instructions"><BookOpen className="mr-2 h-4 w-4"/> Instructions</Link>
                </Button>
                <Button asChild variant="outline" className="h-6 px-2 py-1 text-xs">
                    <Link href="/action-manager/trash"><Trash2 className="mr-2 h-4 w-4"/> Trash</Link>
                </Button>
                <Button asChild variant="outline" className="h-6 px-2 py-1 text-xs">
                    <Link href="/action-manager"><ArrowLeft className="mr-2 h-4 w-4"/> Back to Action Manager</Link></Button>
            </div>
        </header>

        <div className="space-y-6">
            <Card>
                <CardHeader className="text-center">
                    <CardTitle className="text-lg">Selected Actions</CardTitle>
                    <CardDescription>Actions currently on your dashboard. Drag to reorder or add from "Available".</CardDescription>
                    <div className="flex justify-center gap-2 pt-2">
                        <Button variant="outline" onClick={() => handleSortUserChips('asc')} className="h-6 px-2 py-1 text-xs"><ArrowDownAZ className="mr-2 h-4 w-4" /> Sort A-Z</Button>
                        <Button variant="outline" onClick={() => handleSortUserChips('desc')} className="h-6 px-2 py-1 text-xs"><ArrowUpZA className="mr-2 h-4 w-4" /> Sort Z-A</Button>
                        <Button onClick={handleSaveUserChipOrder} className="h-6 px-2 py-1 text-xs"><Save className="mr-2 h-4 w-4" /> Save Order</Button>
                        <Button onClick={handleAddNewChip} className="h-6 px-2 py-1 text-xs">
                            <Plus className="mr-2 h-4 w-4" /> Add New Action
                        </Button>
                    </div>
                </CardHeader>
                <ChipDropZone onDrop={(item) => handleDrop(item, 'user')} onMove={handleMoveUserChip} className="min-h-[150px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1 p-4 place-items-center">
                    {chipsState.userChips.filter(Boolean).map((chip, index) => (
                        <ActionChip key={chip.id} chip={chip} index={index} onDelete={() => handleTrashChip(chip)} onEdit={() => handleEditChip(chip)} />
                    ))}
                </ChipDropZone>
            </Card>
            
            <Card>
                <CardHeader className="text-center">
                    <CardTitle className="text-lg">Available Actions</CardTitle>
                    <CardDescription>Drag actions to "Selected Actions" to add them to your dashboard.</CardDescription>
                    <div className="flex flex-col items-center gap-2 pt-2">
                        <div className="relative w-full max-w-xs">
                            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={availableSearch}
                                onChange={(e) => setAvailableSearch(e.target.value)}
                                placeholder="Search actions..."
                                aria-label="Search available actions"
                                className="h-8 pl-8 pr-8 text-sm"
                            />
                            {availableSearch && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setAvailableSearch('')}
                                    aria-label="Clear search"
                                    className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            )}
                        </div>
                        <div className="flex justify-center gap-2">
                            <Button variant="outline" onClick={() => handleSortAvailableChips('asc')} className="h-6 px-2 py-1 text-xs"><ArrowDownAZ className="mr-2 h-4 w-4" /> Sort A-Z</Button>
                            <Button variant="outline" onClick={() => handleSortAvailableChips('desc')} className="h-6 px-2 py-1 text-xs"><ArrowUpZA className="mr-2 h-4 w-4" /> Sort Z-A</Button>
                        </div>
                        {availableSearch.trim() && (
                            <p className="text-xs text-muted-foreground" aria-live="polite">
                                {filteredAvailableChips.length} of {totalAvailableCount} actions match
                            </p>
                        )}
                    </div>
                </CardHeader>
                <ChipDropZone
                    onDrop={(item) => handleDrop(item, 'available')}
                    className="min-h-[150px] flex flex-col flex-nowrap gap-5 p-4"
                >
                    {availableGroups.length === 0 ? (
                        <p className="w-full py-8 text-center text-sm text-muted-foreground">
                            {availableSearch.trim()
                                ? <>No actions match &ldquo;{availableSearch.trim()}&rdquo;.</>
                                : 'No available actions right now.'}
                        </p>
                    ) : (
                        availableGroups.map((group) => {
                            const GroupIcon = group.icon;
                            return (
                                <div key={group.name} className="space-y-2">
                                    {/* Always-visible divider — groups never collapse or hide chips. */}
                                    <div className="flex items-center gap-1.5 border-b border-border/60 pb-1">
                                        <GroupIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{group.name}</span>
                                        <span className="text-[11px] text-muted-foreground/70">{group.chips.length}</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1 place-items-center">
                                        {group.chips.map((chip, index) => (
                                            <ActionChip key={chip.id} chip={chip} index={index} onDelete={() => handleTrashChip(chip)} onEdit={() => handleEditChip(chip)} />
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </ChipDropZone>
            </Card>
        </div>
        <TrashDropZone />
      </div>

      <AddActionDialog
        isOpen={isAddActionDialogOpen}
        onOpenChange={setIsAddActionDialogOpen}
        onActionAdded={handleActionAdded}
        onActionEdited={handleActionEdited}
        chipToEdit={chipToEdit}
        existingChips={[...chipsState.userChips, ...chipsState.availableChips]}
      />
    </>
  );
}
