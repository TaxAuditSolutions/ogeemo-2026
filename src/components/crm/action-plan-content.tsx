'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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

type Status = 'To Do' | 'In Progress' | 'Done';

const ItemTypes = {
  ACTION: 'action',
};

interface ActionCardProps {
  action: Action;
  index: number;
  moveCard: (dragId: string, hoverId: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onSchedule: () => void;
}

const ActionCard = ({ action, index, moveCard, onEdit, onDelete, onSchedule }: ActionCardProps) => {  
  const ref = useRef<HTMLDivElement>(null);

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
        moveCard(item.id, action.id);
    },
  });

  drag(drop(ref));

  return (
    <div ref={ref} style={{ opacity: isDragging ? 0.5 : 1 }}>
        <Card className="mb-2 cursor-grab active:cursor-grabbing group">
            <CardContent className="p-3 flex justify-between items-start">
                <div className="flex-1" onClick={onEdit}>
                    <p className="font-semibold text-sm">{action.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{action.description}</p>
                </div>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={onEdit}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem onSelect={onSchedule}><Calendar className="mr-2 h-4 w-4" /> Schedule Next Step</DropdownMenuItem>
                        <DropdownMenuItem onSelect={onDelete} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardContent>
        </Card>
    </div>
  );
};

interface ActionColumnProps {
  title: Status;
  actions: Action[];
  moveCard: (dragId: string, hoverId: string) => void;
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

export default function ActionPlanContent() {
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
    
    // Dialog state
    const [dialogTitle, setDialogTitle] = useState('');
    const [dialogDesc, setDialogDesc] = useState('');

    useEffect(() => {
        if (!user) { setIsLoading(false); return; }
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

    const handleSaveAction = async () => {
        if (!user || !dialogTitle.trim()) return;

        try {
            if (actionToEdit) {
                const updatedActionData = { ...actionToEdit, title: dialogTitle, description: dialogDesc };
                await updateAction(actionToEdit.id, { title: dialogTitle, description: dialogDesc });
                setActions(prev => prev.map(a => a.id === actionToEdit.id ? updatedActionData : a));
                toast({ title: 'Action Updated' });
            } else {
                const newActionData: Omit<Action, 'id'> = {
                    title: dialogTitle,
                    description: dialogDesc,
                    status: 'To Do',
                    position: actions.filter(a => a.status === 'To Do').length,
                    leadName,
                    userId: user.uid,
                };
                const newAction = await addAction(newActionData);
                setActions(prev => [...prev, newAction]);
                toast({ title: 'Action Added' });
            }
            setIsDialogOpen(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        }
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
        setActions(prev => prev.map(a => a.id === action.id ? { ...a, status: targetStatus } : a));
        try {
            await updateAction(action.id, { status: targetStatus });
        } catch(error: any) {
            loadData();
            toast({ variant: 'destructive', title: 'Move Failed', description: error.message });
        }
    }, [toast, user, leadName]);
    
    const moveCard = useCallback(async (dragId: string, hoverId: string) => {
        const dragIndex = actions.findIndex(a => a.id === dragId);
        const hoverIndex = actions.findIndex(a => a.id === hoverId);
        const newActions = [...actions];
        const [draggedItem] = newActions.splice(dragIndex, 1);
        newActions.splice(hoverIndex, 0, draggedItem);
        setActions(newActions);
        const updates = newActions.map((action, index) => ({ id: action.id, position: index, status: action.status }));
        await updateActionPositions(updates);
    }, [actions]);

    const loadData = () => { if(user) getActionsForLead(user.uid, leadName).then(setActions); };

    if (isLoading) return <div className="flex h-full items-center justify-center p-12"><LoaderCircle className="h-8 w-8 animate-spin text-primary"/></div>

    return (
        <>
            <div className="p-4 sm:p-6 space-y-6 h-full flex flex-col">
                <header className="flex items-center justify-between">
                    <Button asChild variant="outline"><Link href="/crm/plan"><ArrowLeft className="mr-2 h-4 w-4" /> Back to CRM</Link></Button>
                    <div className="text-center flex-1">
                        <h1 className="text-3xl font-bold font-headline text-primary">Prospect Action Plan: {leadName}</h1>
                        <p className="text-muted-foreground">Next steps to win this client.</p>
                    </div>
                    <Button onClick={() => { setActionToEdit(null); setDialogTitle(''); setDialogDesc(''); setIsDialogOpen(true); }}>
                        <Plus className="mr-2 h-4 w-4" /> Add Action
                    </Button>
                </header>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                    {(['To Do', 'In Progress', 'Done'] as Status[]).map(status => (
                        <ActionColumn
                            key={status}
                            title={status}
                            actions={actions.filter(a => a.status === status).sort((a, b) => a.position - b.position)}
                            moveCard={moveCard}
                            onDropCard={onDropCard}
                            onEditAction={(a) => { setActionToEdit(a); setDialogTitle(a.title); setDialogDesc(a.description || ''); setIsDialogOpen(true); }}
                            onDeleteAction={setActionToDelete}
                            onScheduleAction={handleScheduleAction}
                        />
                    ))}
                </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{actionToEdit ? 'Edit Action' : 'Add a New Action'}</DialogTitle></DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2"><Label htmlFor="action-title">Action Title</Label><Input id="action-title" value={dialogTitle} onChange={(e) => setDialogTitle(e.target.value)} /></div>
                        <div className="space-y-2"><Label htmlFor="action-description">Description</Label><Textarea id="action-description" value={dialogDesc} onChange={(e) => setDialogDesc(e.target.value)} /></div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveAction}>Save Action</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <AlertDialog open={!!actionToDelete} onOpenChange={() => setActionToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>Permanently delete "{actionToDelete?.title}"?</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
