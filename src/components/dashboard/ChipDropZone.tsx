
'use client';

import React from 'react';
import { useDrop } from 'react-dnd';
import { CardContent } from '@/components/ui/card';
import { type ActionChipData } from '@/types/calendar';
import { DraggableItemTypes, ActionChip } from './ActionChip';
import { cn } from '@/lib/utils';

interface ChipDropZoneProps extends React.ComponentProps<typeof CardContent> {
  children: React.ReactNode;
  onDrop: (item: ActionChipData & { index: number }) => void;
  onMove?: (dragIndex: number, hoverIndex: number) => void;
}

export function ChipDropZone({ children, onDrop, onMove, className, ...props }: ChipDropZoneProps) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: DraggableItemTypes.ACTION_CHIP,
    drop: (item: ActionChipData & { index: number }) => {
        onDrop(item);
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }));

  return (
    <CardContent
      ref={drop}
      className={cn(
        "flex flex-wrap gap-2 transition-colors p-4",
        isOver && canDrop && "bg-primary/10 ring-2 ring-primary",
        className
      )}
      {...props}
    >
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child) || child.type !== ActionChip) {
          return child;
        }
        return React.cloneElement(child, {
          onMove,
        } as any);
      })}
    </CardContent>
  );
}
