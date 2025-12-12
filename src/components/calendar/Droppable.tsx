
"use client";

import * as React from 'react';
import { useDrop, DropTargetMonitor } from 'react-dnd';
import { cn } from '@/lib/utils';

interface DroppableProps {
  onDrop: (item: any) => void;
  type: string;
  canDrop?: (item: any, monitor: DropTargetMonitor) => boolean;
  children: React.ReactNode;
  className?: string;
}

export const Droppable = React.forwardRef<HTMLDivElement, DroppableProps>(
  ({ onDrop, type, canDrop, children, className }, ref) => {
    const [{ isOver, canDrop: canDropNow }, drop] = useDrop(() => ({
      accept: type,
      drop: onDrop,
      canDrop,
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
        canDrop: !!monitor.canDrop(),
      }),
    }));

    // This function combines the forwarded ref and the drop ref from react-dnd
    const combineRefs = (el: HTMLDivElement) => {
      drop(el);
      if (typeof ref === 'function') {
        ref(el);
      } else if (ref) {
        ref.current = el;
      }
    };

    return (
      <div
        ref={combineRefs}
        className={cn(
          className,
          isOver && canDropNow && "bg-primary/20 ring-2 ring-primary"
        )}
      >
        {children}
      </div>
    );
  }
);

Droppable.displayName = 'Droppable';
