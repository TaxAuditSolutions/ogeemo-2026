
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, MoreVertical, Edit, Trash2, LoaderCircle, Route } from 'lucide-react';
import Link from 'next/link';
import { useDrag, useDrop } from 'react-dnd';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { getLeads, updateLead, deleteLead, type Lead, type LeadStatus } from '@/services/lead-service';


const ItemTypes = {
  LEAD: 'lead',
};

// --- Draggable Lead Card Component ---
interface LeadCardProps {
  lead: Lead;
  index: number;
  moveCard: (dragIndex: number, hoverIndex: number, sourceStatus: LeadStatus) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onCreatePlan: (lead: Lead) => void;
}

const LeadCard = ({ lead, index, moveCard, onEdit, onDelete, onCreatePlan }: LeadCardProps) => {
    const ref = React.useRef<HTMLDivElement>(null);

    const [{ isDragging }, drag] = useDrag({
        type: ItemTypes.LEAD,
        item: () => ({ ...lead, index }),
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    const [, drop] = useDrop({
        accept: ItemTypes.LEAD,
        hover(item: Lead & { index: number }, monitor) {
            if (!ref.current || item.id === lead.id) {
                return;
            }
            moveCard(item.index, index, lead.status);
            item.index = index;
        },
    });

    drag(drop(ref));

    return (
        <div ref={ref} style={{ opacity: isDragging ? 0.5 : 1 }}>
            <Card className="mb-2 group hover:bg-muted/50 cursor-grab active:cursor-grabbing">
                <CardContent className="p-3 flex justify-between items-start">
                    <div className="flex-1" onClick={() => onEdit(lead)}>
                        <p className="font-semibold text-sm">{lead.contactName}</p>
                        <p className="text-xs text-muted-foreground">{lead.companyName}</p>
                    </div>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => onEdit(lead)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Lead
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => onCreatePlan(lead)}>
                                <Route className="mr-2 h-4 w-4" />
                                Create the plan
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => onDelete(lead)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Lead
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </CardContent>
            </Card>
        </div>
    );
};

// --- Droppable Column Component ---
interface LeadColumnProps {
    status: LeadStatus;
    leads: Lead[];
    moveCard: (dragIndex: number, hoverIndex: number, sourceStatus: LeadStatus) => void;
    onDropCard: (lead: Lead, targetStatus: LeadStatus) => void;
    onEditLead: (lead: Lead) => void;
    onDeleteLead: (lead: Lead) => void;
    onCreatePlan: (lead: Lead) => void;
}

const LeadColumn = ({ status, leads, moveCard, onDropCard, onEditLead, onDeleteLead, onCreatePlan }: LeadColumnProps) => {
    const [{ isOver }, drop] = useDrop({
        accept: ItemTypes.LEAD,
        drop: (item: Lead) => onDropCard(item, status),
        collect: (monitor) => ({
            isOver: monitor.isOver(),
        }),
    });

    const columnTitles: Record<LeadStatus, string> = {
      "Unscheduled Leads": "Unscheduled Leads",
      "Scheduled Leads": "Scheduled Leads",
      "Completed Leads": "Completed Leads",
    };

    return (
        <Card ref={drop} className={`flex flex-col ${isOver ? 'bg-primary/10' : ''}`}>
            <CardHeader>
                <CardTitle>{columnTitles[status]}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-2">
                {leads.map((lead, index) => (
                    <LeadCard 
                        key={lead.id} 
                        lead={lead} 
                        index={index} 
                        moveCard={moveCard} 
                        onEdit={onEditLead}
                        onDelete={onDeleteLead}
                        onCreatePlan={onCreatePlan}
                    />
                ))}
                {leads.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center pt-8 h-full">
                        <p>No leads in this stage.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};


export default function CrmPlanPage() {
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();


  useEffect(() => {
    const loadLeads = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const leadsFromDb = await getLeads(user.uid);
            setAllLeads(leadsFromDb);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error loading leads' });
            console.error("Failed to load leads from firestore:", error);
        } finally {
            setIsLoading(false);
        }
    };
    loadLeads();
  }, [user, toast]);

  const updateLeadsAndStorage = async (updatedLeads: Lead[]) => {
      setAllLeads(updatedLeads);
      // Here you might want to batch update positions in Firestore if needed
  };
  
  const moveCard = useCallback((dragIndex: number, hoverIndex: number, sourceStatus: LeadStatus) => {
      const leadsInColumn = allLeads.filter(lead => lead.status === sourceStatus);
      const draggedCard = leadsInColumn[dragIndex];
      
      const newLeadsInColumn = [...leadsInColumn];
      newLeadsInColumn.splice(dragIndex, 1);
      newLeadsInColumn.splice(hoverIndex, 0, draggedCard);

      const otherLeads = allLeads.filter(lead => lead.status !== sourceStatus);
      updateLeadsAndStorage([...otherLeads, ...newLeadsInColumn]);
  }, [allLeads]);

  const onDropCard = useCallback(async (lead: Lead, targetStatus: LeadStatus) => {
    if (lead.status === targetStatus) return;

    if (targetStatus === 'Scheduled Leads') {
        const query = new URLSearchParams({
            title: `Follow-up with ${lead.contactName}`,
            notes: `Follow-up regarding lead from ${lead.companyName || 'N/A'}.`,
        });
        router.push(`/master-mind?${query.toString()}`);
    } 
    
    // Update status in Firestore
    try {
        await updateLead(lead.id, { status: targetStatus });
        setAllLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: targetStatus } : l));
    } catch (error) {
        toast({ variant: 'destructive', title: 'Failed to update lead status' });
    }
  }, [router, toast]);
  
  const handleEditLead = (lead: Lead) => {
      router.push(`/crm/leads/create?id=${lead.id}`);
  };

  const handleDeleteLead = (lead: Lead) => {
    setLeadToDelete(lead);
  };
  
  const handleConfirmDelete = async () => {
    if (!leadToDelete) return;
    
    try {
        await deleteLead(leadToDelete.id);
        setAllLeads(prev => prev.filter(l => l.id !== leadToDelete.id));
        toast({
            title: "Lead Deleted",
            description: `The lead for "${leadToDelete.contactName}" has been removed.`,
        });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Failed to delete lead' });
    } finally {
        setLeadToDelete(null);
    }
  };

  const handleCreatePlan = (lead: Lead) => {
    // This functionality has been temporarily disabled per user request.
    // New functionality will be added later.
    toast({
        title: "Action Disabled",
        description: "'Create the plan' is temporarily disabled. Please provide the new destination.",
    });
  };


  const columns: LeadStatus[] = ["Unscheduled Leads", "Scheduled Leads", "Completed Leads"];

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6 h-full flex flex-col">
        <header className="flex items-center justify-between">
          <div className="w-1/4">
              <Button asChild variant="outline">
                  <Link href="/crm">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to CRM Hub
                  </Link>
              </Button>
          </div>
          <div className="text-center flex-1">
              <h1 className="text-3xl font-bold font-headline text-primary">
                  The CRM Plan
              </h1>
          </div>
          <div className="w-1/4 flex justify-end">
              <Button asChild>
                  <Link href="/crm/leads/create">
                      <Plus className="mr-2 h-4 w-4" />
                      Create a Lead
                  </Link>
              </Button>
          </div>
        </header>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {columns.map(status => {
              const leadsForColumn = allLeads.filter(l => l.status === status);
              return (
                  <LeadColumn
                      key={status}
                      status={status}
                      leads={leadsForColumn}
                      moveCard={moveCard}
                      onDropCard={onDropCard}
                      onEditLead={handleEditLead}
                      onDeleteLead={handleDeleteLead}
                      onCreatePlan={handleCreatePlan}
                  />
              );
          })}
        </div>
      </div>

       <AlertDialog open={!!leadToDelete} onOpenChange={() => setLeadToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action will permanently delete the lead for "{leadToDelete?.contactName}". This cannot be undone.
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
