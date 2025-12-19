'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import { useDrag, useDrop } from 'react-dnd';

const LEADS_STORAGE_KEY = 'crmLeads';

type LeadStatus = 'Inactive Leads' | 'Active Leads' | 'Scheduled Leads' | 'Completed Leads';

interface Lead {
  id: string;
  contactName: string;
  companyName: string;
  email: string;
  status: LeadStatus;
}

const ItemTypes = {
  LEAD: 'lead',
};

// --- Draggable Lead Card Component ---
interface LeadCardProps {
  lead: Lead;
  index: number;
  moveCard: (dragIndex: number, hoverIndex: number, sourceStatus: LeadStatus) => void;
}

const LeadCard = ({ lead, index, moveCard }: LeadCardProps) => {
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
            <Card className="mb-2 cursor-move">
                <CardContent className="p-3">
                    <p className="font-semibold text-sm">{lead.contactName}</p>
                    <p className="text-xs text-muted-foreground">{lead.companyName}</p>
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
}

const LeadColumn = ({ status, leads, moveCard, onDropCard }: LeadColumnProps) => {
    const [{ isOver }, drop] = useDrop({
        accept: ItemTypes.LEAD,
        drop: (item: Lead) => onDropCard(item, status),
        collect: (monitor) => ({
            isOver: monitor.isOver(),
        }),
    });

    return (
        <Card ref={drop} className={`flex flex-col ${isOver ? 'bg-primary/10' : ''}`}>
            <CardHeader>
                <CardTitle>{status}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-2">
                {leads.map((lead, index) => (
                    <LeadCard key={lead.id} lead={lead} index={index} moveCard={moveCard} />
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

  useEffect(() => {
    try {
      const savedLeadsRaw = sessionStorage.getItem(LEADS_STORAGE_KEY);
      if (savedLeadsRaw) {
        setAllLeads(JSON.parse(savedLeadsRaw));
      }
    } catch (error) {
      console.error("Failed to load leads from session storage:", error);
    }
  }, []);

  const updateLeadsAndStorage = (updatedLeads: Lead[]) => {
      setAllLeads(updatedLeads);
      sessionStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(updatedLeads));
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

  const onDropCard = useCallback((lead: Lead, targetStatus: LeadStatus) => {
      const updatedLeads = allLeads.map(l => 
          l.id === lead.id ? { ...l, status: targetStatus } : l
      );
      updateLeadsAndStorage(updatedLeads);
  }, [allLeads]);
  
  const columns: LeadStatus[] = ["Inactive Leads", "Active Leads", "Scheduled Leads", "Completed Leads"];

  return (
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
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
        {columns.map(status => (
            <LeadColumn
                key={status}
                status={status}
                leads={allLeads.filter(l => l.status === status)}
                moveCard={moveCard}
                onDropCard={onDropCard}
            />
        ))}
      </div>
    </div>
  );
}
