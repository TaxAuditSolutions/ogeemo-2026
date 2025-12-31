
'use client';

import React, { useRef } from 'react';
import { useDrag, useDrop, XYCoord } from 'react-dnd';
import { Card, CardContent } from '@/components/ui/card';
import { GripVertical, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { type Project } from '@/types/calendar-types';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';


export const ItemTypes = {
  PROJECT_CARD: 'project_card',
};

interface DraggableProjectCardProps {
  project: Project;
  clientName: string;
  index: number;
  status: Project['status'];
  moveCard: (dragIndex: number, hoverIndex: number, sourceStatus: Project['status']) => void;
  onClick: () => void;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
}

interface DragItem {
  index: number;
  id: string;
  status: Project['status'];
  type: string;
}

export const DraggableProjectCard = ({ project, clientName, index, status, moveCard, onClick, onEdit, onDelete }: DraggableProjectCardProps) => {
    const ref = useRef<HTMLDivElement>(null);

    const [{ isDragging }, drag] = useDrag({
        type: ItemTypes.PROJECT_CARD,
        item: () => ({ id: project.id, index, status }),
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    const [, drop] = useDrop({
        accept: ItemTypes.PROJECT_CARD,
        hover(item: DragItem, monitor) {
            if (!ref.current || item.id === project.id) {
                return;
            }
            if (item.status === status) {
                 moveCard(item.index, index, status);
                 item.index = index;
            }
        },
    });

    drag(drop(ref));

    return (
        <div ref={ref} className={cn("cursor-move group", isDragging && 'opacity-50')}>
            <Card onClick={onClick}>
                <CardContent className="p-3 flex items-start gap-2">
                    <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                    <div className="flex-1">
                        <p className="font-semibold text-sm">{project.name}</p>
                        <p className="text-xs text-muted-foreground">{clientName}</p>
                    </div>
                     {(onEdit || onDelete) && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {onEdit && <DropdownMenuItem onSelect={() => onEdit(project)}><Pencil className="mr-2 h-4 w-4" /> Edit Details</DropdownMenuItem>}
                                {onDelete && <DropdownMenuItem onSelect={() => onDelete(project)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete Project</DropdownMenuItem>}
                            </DropdownMenuContent>
                        </DropdownMenu>
                     )}
                </CardContent>
            </Card>
        </div>
    );
};
