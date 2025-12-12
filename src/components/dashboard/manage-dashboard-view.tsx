
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useDrop } from 'react-dnd';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoaderCircle, Plus, ArrowLeft, Trash2, ArrowDownAZ, ArrowUpZA, Save, BookOpen } from 'lucide-react';
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
            ref={drop}
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

  const handleStateUpdate = React.useCallback(async (
    newUserChips: ActionChipData[],
    newAvailableChips: ActionChipData[],
  ) => {
    setChipsState({ userChips: newUserChips, availableChips: newAvailableChips });
    if (user) {
      await updateActionChips(user.uid, newUserChips);
      await updateAvailableActionChips(user.uid, newAvailableChips);
    }
  }, [user]);

  const handleMoveUserChip = React.useCallback((dragIndex: number, hoverIndex: number) => {
    setChipsState(prevState => {
      const newUserChips = [...prevState.userChips];
      const [draggedItem] = newUserChips.splice(dragIndex, 1);
      newUserChips.splice(hoverIndex, 0, draggedItem);
      // Local state is updated for immediate visual feedback.
      // Final order is persisted on "Save" button click.
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
    // After a chip is added via the dialog, reload all chips from the DB
    // to ensure the UI is in sync with the source of truth.
    loadChips();
  };
  
  const handleActionEdited = (editedChip: ActionChipData) => {
      setChipsState(prevState => ({
          userChips: prevState.userChips.map(c => c.id === editedChip.id ? editedChip : c),
          availableChips: prevState.availableChips.map(c => c.id === editedChip.id ? editedChip : c),
      }));
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

  const handleSaveUserChipOrder = async () => {
    if (!user) return;
    try {
      await updateActionChips(user.uid, chipsState.userChips);
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
                <h1 className="text-2xl font-bold font-headline text-primary">Manage Dashboard</h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                    Drag and drop actions to customize your dashboard.
                </p>
            </div>
            <div className="flex items-center gap-2">
                <Button asChild className="h-6 px-2 py-1 text-xs">
                    <Link href="/action-manager/manage/instructions"><BookOpen className="mr-2 h-4 w-4"/> Instructions</Link>
                </Button>
                <Button asChild className="bg-slate-900 text-white hover:bg-slate-900/90 h-6 px-2 py-1 text-xs">
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
                </CardHeader>
                <ChipDropZone onDrop={(item) => handleDrop(item, 'available')} className="min-h-[150px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1 p-4 place-items-center">
                    {chipsState.availableChips.filter(Boolean).map((chip, index) => (
                        <ActionChip key={chip.id} chip={chip} index={index} onDelete={() => handleTrashChip(chip)} onEdit={() => handleEditChip(chip)} />
                    ))}
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

    