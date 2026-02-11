
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDrag, useDrop } from 'react-dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, MoreVertical, Edit, Trash2, LoaderCircle, Route, Calendar } from 'lucide-react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { type Action, getActionsForLead, addAction, updateAction, deleteAction, updateActionPositions } from '@/services/crm-action-service';
import { getContacts, type Contact } from '@/services/contact-service';

// --- Types ---
type Status = 'To Do' | 'In Progress' | 'Done';

const ItemTypes = {
  ACTION: 'action',
};

// --- ActionCard Component ---
interface ActionCardProps {
  action: Action;
  index: number;
  moveCard: (dragIndex: number, hoverIndex: number, sourceStatus: Status) => void;
  onEdit: () => void;
  onDelete: () => void;
  onSchedule: () => void;
}

const ActionCard = ({ action, index, moveCard, onEdit, onDelete, onSchedule }: ActionCardProps) => {  
  const ref = React.useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.ACTION,
    item: () => ({ ...action, index }),
    collect: (monitor: any) => ({
      isDragging: monitor.isDragging(),
    }),
  });
  
  const [, drop] = useDrop({
    accept: ItemTypes.ACTION,
    hover(item: Action & { index: number }, monitor: any) {
        if (!ref.current || item.id === action.id) {
            return;
        }
        moveCard(item.index, index, action.status);
        item.index = index;
    },
  });

  drag(drop(ref));

  return (
    <div ref={ref} style={{ opacity: isDragging ? 0.5 : 1 }}>
        <Card className="mb-2 cursor-grab active:cursor-grabbing group">
            <CardContent className="p-3 flex justify-between items-start">
                <div className="flex-1" onClick={onEdit}>
                    <p className="font-semibold text-sm">{action.title}</p>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={onEdit}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={onSchedule}>
                            <Calendar className="mr-2 h-4 w-4" /> Schedule Next Step
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={onDelete} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardContent>
        </Card>
    </div>
  );
};


// --- ActionColumn Component ---
interface ActionColumnProps {
  title: Status;
  actions: Action[];
  moveCard: (dragIndex: number, hoverIndex: number, sourceStatus: Status) => void;
  onDropCard: (action: Action, targetStatus: Status) => void;
  onEditAction: (action: Action) => void;
  onDeleteAction: (action: Action) => void;
  onScheduleAction: (action: Action) => void;
}

const ActionColumn = ({ title, actions, moveCard, onDropCard, onEditAction, onDeleteAction, onScheduleAction }: ActionColumnProps) => {
    const [{ isOver }, drop] = useDrop({
        accept: ItemTypes.ACTION,
        drop: (item: Action) => onDropCard(item, title),
        collect: (monitor: any) => ({
            isOver: monitor.isOver(),
        }),
    });

    return (
        <Card ref={drop} className={cn("flex flex-col h-full min-h-[400px]", isOver ? 'bg-primary/10' : '')}>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-2">
                {actions.map((action, index) => (
                    <ActionCard
                        key={action.id}
                        action={action}
                        index={index}
                        moveCard={moveCard}
                        onEdit={() => onEditAction(action)}
                        onDelete={() => onDeleteAction(action)}
                        onSchedule={() => onScheduleAction(action)}
                    />
                ))}
                {actions.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center pt-8 h-full">
                        <p>No items in this stage.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

// --- AddActionDialog Component ---
interface AddActionDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onSave: (actionData: Omit<Action, 'id' | 'userId' | 'leadName' | 'status' | 'position'>, actionToEdit: Action | null) => void;
    actionToEdit: Action | null;
}

const AddActionDialog = ({ isOpen, onOpenChange, onSave, actionToEdit }: AddActionDialogProps) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const { toast } = useToast();

    React.useEffect(() => {
        if (actionToEdit) {
            setTitle(actionToEdit.title);
            setDescription(actionToEdit.description || '');
        } else {
            setTitle('');
            setDescription('');
        }
    }, [actionToEdit, isOpen]);

    const handleSave = () => {
        if (!title.trim()) {
            toast({ variant: 'destructive', title: 'Action title is required.' });
            return;
        }
        onSave({ title, description }, actionToEdit);
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{actionToEdit ? 'Edit Action' : 'Add a New Action'}</DialogTitle>
                    <DialogDescription>
                        {actionToEdit ? 'Update the details for this action.' : 'Describe the action you want to add to your "To Do" list.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="action-title">Action Title</Label>
                        <Input id="action-title" value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="action-description">Description</Label>
                        <Textarea id="action-description" value={description} onChange={(e) => setDescription(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save Action</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


export default function CrmActionPlanPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const leadName = searchParams.get('leadName') || 'New Plan';
    const { user } = useAuth();
    const { toast } = useToast();

    const [actions, setActions] = useState<Action[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionToEdit, setActionToEdit] = useState<Action | null>(null);
    const [actionToDelete, setActionToDelete] = useState<Action | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        const fetchActions = async () => {
            setIsLoading(true);
            try {
                const [fetchedActions, fetchedContacts] = await Promise.all([
                    getActionsForLead(user.uid, leadName),
                    getContacts(user.uid),
                ]);
                setActions(fetchedActions);
                setContacts(fetchedContacts);
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Failed to load actions', description: error.message });
            } finally {
                setIsLoading(false);
            }
        };
        fetchActions();
    }, [user, leadName, toast]);

    const handleSaveAction = async (actionData: Omit<Action, 'id' | 'userId' | 'leadName' | 'status' | 'position'>, existingAction: Action | null) => {
        if (!user) return;

        try {
            if (existingAction) {
                const updatedActionData = { ...existingAction, ...actionData };
                await updateAction(existingAction.id, { title: updatedActionData.title, description: updatedActionData.description });
                setActions(prev => prev.map(a => a.id === existingAction.id ? updatedActionData : a));
                toast({ title: 'Action Updated' });
            } else {
                const newActionData: Omit<Action, 'id'> = {
                    ...actionData,
                    status: 'To Do',
                    position: actions.filter(a => a.status === 'To Do').length,
                    leadName,
                    userId: user.uid,
                };
                const newAction = await addAction(newActionData);
                setActions(prev => [...prev, newAction]);
                toast({ title: 'Action Added' });
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        }
    };

    const handleDeleteAction = (action: Action) => {
        setActionToDelete(action);
    };

    const handleConfirmDelete = async () => {
        if (!actionToDelete) return;
        try {
            await deleteAction(actionToDelete.id);
            setActions(prev => prev.filter(a => a.id !== actionToDelete.id));
            toast({ title: 'Action Deleted' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
        } finally {
            setActionToDelete(null);
        }
    };
    
    const handleScheduleAction = (action: Action) => {
        const contact = contacts.find(c => c.name === leadName);
        const query = new URLSearchParams({
            title: `CRM: ${action.title} for ${leadName}`,
            notes: action.description || '',
            contactId: contact?.id || '',
        }).toString();
        router.push(`/master-mind?${query}`);
    };

    const onDropCard = useCallback(async (action: Action, targetStatus: Status) => {
        if (action.status === targetStatus) return;
        
        const originalActions = actions;
        setActions(prev => prev.map(a => a.id === action.id ? { ...a, status: targetStatus } : a));

        try {
            await updateAction(action.id, { status: targetStatus });
        } catch(error: any) {
            setActions(originalActions);
            toast({ variant: 'destructive', title: 'Move Failed', description: error.message });
        }
    }, [actions, toast]);
    
    const moveCard = useCallback(async (dragId: string, hoverId: string, sourceStatus: Status) => {
        const dragIndex = actions.findIndex(a => a.id === dragId);
        const hoverIndex = actions.findIndex(a => a.id === hoverId);
        
        const newActions = [...actions];
        const [draggedItem] = newActions.splice(dragIndex, 1);
        newActions.splice(hoverIndex, 0, draggedItem);

        const positionUpdates = newActions.map((action, index) => ({
            id: action.id,
            position: index,
            status: action.status,
        }));

        setActions(newActions); // Optimistic update
        await updateActionPositions(positionUpdates);

    }, [actions]);

    const columns: Status[] = ["To Do", "In Progress", "Done"];

    if (isLoading) {
        return <div className="flex h-full items-center justify-center p-12"><LoaderCircle className="h-8 w-8 animate-spin text-primary"/></div>
    }

    return (
        <>
            <div className="p-4 sm:p-6 space-y-6 h-full flex flex-col">
                <header className="flex items-center justify-between">
                    <div className="w-1/4">
                        <Button asChild variant="outline">
                            <Link href="/crm/plan">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to CRM pipeline
                            </Link>
                        </Button>
                    </div>
                    <div className="text-center flex-1">
                        <h1 className="text-3xl font-bold font-headline text-primary">
                            Prospect Action Plan: {leadName}
                        </h1>
                        <p className="text-muted-foreground">Define the next steps to win this client.</p>
                    </div>
                    <div className="w-1/4 flex justify-end">
                        <Button onClick={() => { setActionToEdit(null); setIsDialogOpen(true); }}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add an Action
                        </Button>
                    </div>
                </header>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                    {columns.map(status => {
                        const columnActions = actions.filter(a => a.status === status).sort((a, b) => a.position - b.position);
                        return <ActionColumn
                            key={status}
                            title={status}
                            actions={columnActions}
                            moveCard={moveCard}
                            onDropCard={onDropCard}
                            onEditAction={(action) => { setActionToEdit(action); setIsDialogOpen(true); }}
                            onDeleteAction={handleDeleteAction}
                            onScheduleAction={handleScheduleAction}
                        />;
                    })}
                </div>
            </div>
            <AddActionDialog isOpen={isDialogOpen} onOpenChange={setIsDialogOpen} onSave={handleSaveAction} actionToEdit={actionToEdit} />
            <AlertDialog open={!!actionToDelete} onOpenChange={() => setActionToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the action: "{actionToDelete?.title}".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
