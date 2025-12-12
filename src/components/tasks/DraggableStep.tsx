
'use client';

import React, { useRef } from 'react';
import { useDrag, useDrop, XYCoord } from 'react-dnd';
import { type ProjectStep } from '@/types/calendar-types';
import { cn } from '@/lib/utils';

export const ItemTypes = {
  STEP: 'step',
};

interface DraggableStepProps {
  step: Partial<ProjectStep>;
  index: number;
  moveStep: (dragIndex: number, hoverIndex: number) => void;
  children: React.ReactNode;
}

interface DragItem {
  index: number;
  id: string;
  type: string;
}

export function DraggableStep({ step, index, moveStep, children }: DraggableStepProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.STEP,
    item: () => ({ ...step, index, type: ItemTypes.STEP }), // Add the full step data and type
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: ItemTypes.STEP,
    hover(item: DragItem, monitor) {
      if (!ref.current) return;

      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) return;

      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = (clientOffset as XYCoord).y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

      moveStep(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      className={cn('cursor-move', isDragging && 'opacity-50')}
    >
      {children}
    </div>
  );
}
