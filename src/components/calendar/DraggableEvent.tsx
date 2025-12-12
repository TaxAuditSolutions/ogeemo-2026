
'use client';

import React from 'react';
import { useDrag } from 'react-dnd';
import { type Event } from '@/types/calendar-types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export const ItemTypes = {
  EVENT: 'event',
};

interface DraggableEventProps {
  event: Event;
  style: React.CSSProperties;
  onClick: () => void;
}

export function DraggableEvent({ event, style, onClick }: DraggableEventProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.EVENT,
    item: event,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const startTime = format(event.start!, 'h:mm a');

  return (
    <div
      ref={drag}
      style={style}
      onClick={onClick}
      className={cn(
        'absolute w-full rounded-lg p-2 text-xs border cursor-move transition-opacity',
        isDragging ? 'opacity-50' : 'opacity-100',
        'bg-primary/20 border-primary text-primary-foreground'
      )}
    >
      <p className="font-bold truncate">{event.title}</p>
      <p className="truncate">{startTime}</p>
    </div>
  );
}
