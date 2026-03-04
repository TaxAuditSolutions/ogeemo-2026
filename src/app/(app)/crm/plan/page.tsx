
'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, MoreVertical, Edit, Trash2, LoaderCircle, Route, X } from 'lucide-react';
import Link from 'next/link';
import { useDrag, useDrop } from 'react-dnd';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { getContacts, updateContact, deleteContacts, type Contact } from '@/services/contact-service';
import { ensureSystemFolders } from '@/services/contact-folder-service';
import { getAllCrmActions, type Action as CrmAction } from '@/services/crm-action-service';

const ItemTypes = {
  LEAD: 'lead',
};

// --- Draggable Lead Card Component ---
interface LeadCardProps {
  lead: Contact;
  index: number;
  hasPlan: boolean;
  moveCard: (dragIndex: number, hoverIndex: number, sourceStatus: string) => void;
  onEdit: (lead: Contact) => void;
  onDelete: (lead: Contact) => void;
  onPlanAction: (lead: Contact) => void;
}

const LeadCard = ({ lead, index, hasPlan, moveCard, onEdit, onDelete, onPlanAction }: LeadCardProps) => {
    const ref = React.useRef<HTMLDivElement>(null);

    const [{ isDragging }, drag] = useDrag({
        type: ItemTypes.LEAD,
        item: () => ({ ...lead, index }),
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    });

    const [, drop] = useDrop({
        accept: ItemTypes.LEAD,
        hover(item: Contact & { index: number }, monitor) {
            if (!ref.current || item.id === lead.id) {
                return;
            }
            moveCard(item.index, index, lead.status || 'Unscheduled Leads');
            item.index = index;
        },
    });

    drag(drop(ref));

    return (
        <div ref={ref} style={{ opacity: isDragging ? 0.5 : 1 }}>
            <Card className="mb-2 group hover:bg-muted/50 cursor-grab active:cursor-grabbing text-black">
                <CardContent className="p-3 flex justify-between items-start">
                    <div className="flex-1" onClick={() => onEdit(lead)}>
                        <p className="font-semibold text-sm">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">{lead.businessName}</p>
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
                                Edit Prospect
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => onPlanAction(lead)}>
                                <Route className="mr-2 h-4 w-4" />
                                {hasPlan ? 'View Plan' : 'Create the plan'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => onDelete(lead)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Prospect
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
    status: string;
    leads: Contact[];
    allCrmActions: CrmAction[];
    moveCard: (dragIndex: number, hoverIndex: number, sourceStatus: string) => void;
    onDropCard: (lead: Contact, targetStatus: string) => void;
    onEditLead: (lead: Contact) => void;
    onDeleteLead: (lead: Contact) => void;
    onPlanAction: (lead: Contact) => void;
}

const LeadColumn = ({ status, leads, allCrmActions, moveCard, onDropCard, onEditLead, onDeleteLead, onPlanAction }: LeadColumnProps) => {
    const [{ isOver }, drop] = useDrop({
        accept: ItemTypes.LEAD,
        drop: (item: Contact) => onDropCard(item, status),
        collect: (monitor) => ({
            isOver: monitor.isOver(),
        }),
    });

    return (
        <Card ref={drop} className={`flex flex-col h-full min-h-[400px] text-black ${isOver ? 'bg-primary/10' : ''}`}>
            <CardHeader className="text-center">
                <CardTitle>{status}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-2">
                {leads.map((lead, index) => {
                    const hasPlan = allCrmActions.some(action => action.leadName === lead.name);
                    return (
                        <LeadCard 
                            key={lead.id} 
                            lead={lead} 
                            index={index} 
                            hasPlan={hasPlan}
                            moveCard={moveCard} 
                            onEdit={onEditLead}
                            onDelete={onDeleteLead}
                            onPlanAction={onPlanAction}
                        />
                    );
                })}
                {leads.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center pt-8 h-full">
                        <p>No prospects in this stage.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

function CrmPlanContent() {
  const [prospects, setProspects] = useState<Contact[]>([]);
  const [allCrmActions, setAllCrmActions] = useState<CrmAction[]>([]);
  const [leadToDelete, setLeadToDelete] = useState<Contact | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  const loadData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
        const folders = await ensureSystemFolders(user.uid);
        const prospectsFolder = folders.find(f => f.name === 'Prospects' && f.isSystem);
        
        if (!prospectsFolder) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not find the Prospects folder.' });
            return;
        }

        const [contactsFromDb, actionsFromDb] = await Promise.all([
            getContacts(), // Synchronized Directory
            getAllCrmActions(user.uid),
        ]);

        const leads = contactsFromDb.filter(c => c.folderId === prospectsFolder.id);
        setProspects(leads);
        setAllCrmActions(actionsFromDb);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error loading data' });
    } finally {
        setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const moveCard = useCallback((dragIndex: number, hoverIndex: number, sourceStatus: string) => {
      setProspects(prev => {
          const leadsInColumn = prev.filter(lead => (lead.status || 'Unscheduled Leads') === sourceStatus);
          const otherLeads = prev.filter(lead => (lead.status || 'Unscheduled Leads') !== sourceStatus);
          
          const newLeadsInColumn = [...leadsInColumn];
          const [draggedCard] = newLeadsInColumn.splice(dragIndex, 1);
          newLeadsInColumn.splice(hoverIndex, 0, draggedCard);

          return [...otherLeads, ...newLeadsInColumn];
      });
  }, []);

  const onDropCard = useCallback(async (lead: Contact, targetStatus: string) => {
    if ((lead.status || 'Unscheduled Leads') === targetStatus) return;

    if (targetStatus === 'Scheduled Leads') {
        const query = new URLSearchParams({
            title: `Follow-up with ${lead.name}`,
            notes: `Follow-up regarding potential lead from ${lead.businessName || 'N/A'}.`,
            contactId: lead.id,
        });
        toast({ title: 'Rescheduling...', description: 'Taking you to the scheduler to book your follow-up.' });
        router.push(`/master-mind?${query.toString()}`);
    } 
    
    try {
        await updateContact(lead.id, { status: targetStatus });
        setProspects(prev => prev.map(l => l.id === lead.id ? { ...l, status: targetStatus } : l));
    } catch (error) {
        toast({ variant: 'destructive', title: 'Failed to update lead status' });
    }
  }, [router, toast]);
  
  const handleEditLead = (lead: Contact) => {
      router.push(`/crm/leads/create?id=${lead.id}`);
  };

  const handleConfirmDelete = async () => {
    if (!leadToDelete) return;
    try {
        await deleteContacts([leadToDelete.id]);
        setProspects(prev => prev.filter(l => l.id !== leadToDelete.id));
        toast({ title: "Prospect Deleted" });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Delete Failed' });
    } finally {
        setLeadToDelete(null);
    }
  };

  const handlePlanAction = (lead: Contact) => {
    router.push(`/crm/action-plan?leadName=${encodeURIComponent(lead.name)}`);
  };

  const columns = ["Unscheduled Leads", "Scheduled Leads", "Completed Leads"];

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6 h-full flex flex-col text-black">
        <header className="flex flex-col lg:flex-row items-center justify-between gap-4 mb-2">
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 lg:w-1/3">
              <Button asChild variant="outline" size="sm" className="whitespace-nowrap">
                  <Link href="/action-manager">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Action Manager
                  </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="whitespace-nowrap">
                  <Link href="/contacts">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Contact Hub
                  </Link>
              </Button>
          </div>
          <div className="text-center flex-1">
              <h1 className="text-2xl md:text-3xl font-bold font-headline text-primary">
                  CRM Leads Pipeline
              </h1>
              <p className="text-muted-foreground text-xs md:text-sm">Managing Prospects from the Contacts Hub</p>
          </div>
          <div className="flex justify-center lg:justify-end lg:w-1/3">
              <Button asChild size="sm">
                  <Link href="/crm/leads/create">
                      <Plus className="mr-2 h-4 w-4" />
                      Add a Prospect
                  </Link>
              </Button>
          </div>
        </header>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {columns.map(status => {
              const leadsForColumn = prospects.filter(l => (l.status || 'Unscheduled Leads') === status);
              return (
                  <LeadColumn
                      key={status}
                      status={status}
                      leads={leadsForColumn}
                      allCrmActions={allCrmActions}
                      moveCard={moveCard}
                      onDropCard={onDropCard}
                      onEditLead={handleEditLead}
                      onDeleteLead={setLeadToDelete}
                      onPlanAction={handlePlanAction}
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
                    This will delete the contact record for "{leadToDelete?.name}". This cannot be undone.
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

export default function CrmPlanPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><LoaderCircle className="h-10 w-10 animate-spin text-primary" /></div>}>
      <CrmPlanContent />
    </Suspense>
  );
}
