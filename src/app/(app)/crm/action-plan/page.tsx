'use client';

import React, { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDrag, useDrop } from 'react-dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// --- Types ---
type Status = 'To Do' | 'In Progress' | 'Done';

interface Action {
  id: string;
  title: string;
  description: string;
  status: Status;
}

const ItemTypes = {
  ACTION: 'action',
};

// --- ActionCard Component ---
interface ActionCardProps {
  action: Action;
  index: number;
  moveCard: (dragIndex: number, hoverIndex: number, sourceStatus: Status) => void;
}

const ActionCard = ({ action, index, moveCard }: ActionCardProps) => {  
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
        <Card className="mb-2 cursor-grab active:cursor-grabbing">
            <CardContent className="p-3">
                <p className="font-semibold text-sm">{action.title}</p>
                <p className="text-xs text-muted-foreground">{action.description}</p>
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
}

const ActionColumn = ({ title, actions, moveCard, onDropCard }: ActionColumnProps) => {
    const [{ isOver }, drop] = useDrop({
        accept: ItemTypes.ACTION,
        drop: (item: Action) => onDropCard(item, title),
        collect: (monitor: any) => ({
            isOver: monitor.isOver(),
        }),
    });

    return (
        <Card ref={drop} className={cn("flex flex-col", isOver ? 'bg-primary/10' : '')}>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-2">
                {actions.map((action, index) => (
                    <ActionCard key={action.id} action={action} index={index} moveCard={moveCard} />
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
    onSave: (title: string, description: string) => void;
}

const AddActionDialog = ({ isOpen, onOpenChange, onSave }: AddActionDialogProps) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const { toast } = useToast();

    const handleSave = () => {
        if (!title.trim()) {
            toast({ variant: 'destructive', title: 'Action title is required.' });
            return;
        }
        onSave(title, description);
        onOpenChange(false);
        setTitle('');
        setDescription('');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add a New Action</DialogTitle>
                    <DialogDescription>
                        Describe the action you want to add to your "To Do" list.
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
    const leadName = searchParams.get('leadName');

    const [actions, setActions] = useState<Action[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleAddAction = (title: string, description: string) => {
        const newAction: Action = {
            id: `action_${Date.now()}`,
            title,
            description,
            status: 'To Do',
        };
        setActions(prev => [...prev, newAction]);
    };

    const moveCard = useCallback((dragIndex: number, hoverIndex: number, sourceStatus: Status) => {
        setActions(prev => {
            const columnActions = prev.filter(a => a.status === sourceStatus);
            const otherActions = prev.filter(a => a.status !== sourceStatus);
            const draggedCard = columnActions[dragIndex];
            
            const newColumnActions = [...columnActions];
            newColumnActions.splice(dragIndex, 1);
            newColumnActions.splice(hoverIndex, 0, draggedCard);

            return [...otherActions, ...newColumnActions];
        });
    }, []);

    const onDropCard = useCallback((action: Action, targetStatus: Status) => {
        if (action.status === targetStatus) return;
        setActions(prev => prev.map(a => a.id === action.id ? { ...a, status: targetStatus } : a));
    }, []);

    const columns: Status[] = ["To Do", "In Progress", "Done"];

    return (
        <>
            <div className="p-4 sm:p-6 space-y-6 h-full flex flex-col">
                <header className="flex items-center justify-between">
                    <div className="w-1/4">
                        <Button asChild variant="outline">
                            <Link href="/crm/plan">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to CRM Plan
                            </Link>
                        </Button>
                    </div>
                    <div className="text-center flex-1">
                        <h1 className="text-3xl font-bold font-headline text-primary">
                            CRM Action Plan: {leadName || 'New Plan'}
                        </h1>
                        <p className="text-muted-foreground">Manage the next steps for your leads.</p>
                    </div>
                    <div className="w-1/4 flex justify-end">
                        <Button onClick={() => setIsDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add an Action
                        </Button>
                    </div>
                </header>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                    {columns.map(status => {
                        const columnActions = actions.filter(a => a.status === status);
                        return <ActionColumn key={status} title={status} actions={columnActions} moveCard={moveCard} onDropCard={onDropCard} />;
                    })}
                </div>
            </div>
            <AddActionDialog isOpen={isDialogOpen} onOpenChange={setIsDialogOpen} onSave={handleAddAction} />
        </>
    );
}
