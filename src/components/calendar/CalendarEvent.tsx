
'use client';

import React from 'react';
import { useDrag } from 'react-dnd';
import {
  MoreVertical,
  Pencil,
  Trash2,
  CheckCircle,
  Briefcase,
  Clock,
  PlayCircle,
} from 'lucide-react';
import { type Event } from '@/types/calendar-types';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '../ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Define item type for react-dnd
export const ItemTypes = {
  EVENT: 'event',
};

interface CalendarEventProps {
  event: Event;
  onEdit: (event: Event) => void;
  onDelete: (event: Event) => void;
  onToggleComplete: (event: Event) => void;
}

export function CalendarEvent({
  event,
  onEdit,
  onDelete,
  onToggleComplete,
}: CalendarEventProps) {
  const isCompleted = event.status === 'done';
  const router = useRouter();

  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.EVENT,
    item: event, // The item being dragged is the entire event object
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const handleConvertToProject = () => {
    const projectData = {
      name: event.title,
      description: event.description,
    };
    sessionStorage.setItem(
      'ogeemo-event-to-project',
      JSON.stringify(projectData)
    );
    router.push('/projects/all');
  };

  return (
    <div
      ref={drag}
      className={cn(
        'relative rounded-md p-1 group flex items-center justify-between border w-full my-0.5',
        isCompleted
          ? 'bg-muted text-muted-foreground border-gray-300'
          : 'bg-primary/20 text-black border-tan',
        isDragging && 'opacity-50 cursor-grabbing',
        !isDragging && 'cursor-grab'
      )}
    >
      <div
        className="flex-1 overflow-hidden px-2 py-1"
        onClick={() => onEdit(event)}
      >
        <p className={cn('text-xs font-semibold', isCompleted && 'line-through')}>
          {event.title}
        </p>
      </div>

      <div className="flex-shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Event options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenuItem onSelect={() => onEdit(event)}>
              <Pencil className="mr-2 h-4 w-4" /> Open / Edit
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/master-mind?eventId=${event.id}&startTimer=true`}>
                <PlayCircle className="mr-2 h-4 w-4" /> Start Timer
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/master-mind?logTimeFor=${event.id}`}>
                <Clock className="mr-2 h-4 w-4" /> Log Actual Time
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onToggleComplete(event)}>
              <CheckCircle className="mr-2 h-4 w-4" />
              {isCompleted ? 'Mark as Not Completed' : 'Mark as Completed'}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleConvertToProject}>
              <Briefcase className="mr-2 h-4 w-4" /> Convert to Project
            </DropdownMenuItem>
            {event.projectId && (
              <DropdownMenuItem asChild>
                <Link href={`/projects/${event.projectId}/tasks`}>
                  <Briefcase className="mr-2 h-4 w-4" /> Go to Project Workspace
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => onDelete(event)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
