
"use client";

import React, { useRef } from 'react';
import Link from 'next/link';
import { useDrag, useDrop } from 'react-dnd';
import { Button } from "@/components/ui/button";
import { type MenuItem } from '@/lib/menu-items';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';

interface DraggableMenuItemProps {
  item: MenuItem;
  index: number;
  isActive: boolean;
  moveMenuItem: (dragIndex: number, hoverIndex: number) => void;
  isDraggable?: boolean;
  isCompact?: boolean;
}

interface DragItem {
  index: number;
  id: string;
  type: string;
}

const DraggableMenuItemComponent = React.forwardRef<HTMLDivElement, DraggableMenuItemProps>(({ 
    item, 
    index, 
    isActive, 
    moveMenuItem, 
    isDraggable = true, 
    isCompact = false 
}, forwardedRef) => {
  const localRef = useRef<HTMLDivElement>(null);
  const ref = (forwardedRef as React.RefObject<HTMLDivElement>) || localRef;
  const Icon = item.icon;

  const [{ isDragging }, drag, preview] = useDrag({
    type: 'MENU_ITEM',
    item: () => ({ id: item.href, index }),
    canDrag: isDraggable,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'MENU_ITEM',
    hover(draggedItem: DragItem, monitor) {
      if (!ref.current || !isDraggable) return;
      
      const dragIndex = draggedItem.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;

      moveMenuItem(dragIndex, hoverIndex);
      draggedItem.index = hoverIndex;
    },
  });

  drag(drop(ref));

  const isExternal = item.href.startsWith('http');

  const buttonContent = (
    <>
      <Icon className="h-4 w-4" />
      <span>{item.label}</span>
    </>
  );

  return (
    <div
      ref={isDraggable ? preview : null}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className="relative"
    >
      <div ref={ref} className="flex items-center">
        {isExternal ? (
           <Button
            asChild
            variant={isActive ? "secondary" : "ghost"}
            className={cn(
                "w-full justify-start gap-3",
                isDraggable ? "pl-8" : "pl-3",
                isCompact ? "h-9 text-sm" : "h-5 text-sm py-1",
                "border-b-4 border-black hover:bg-sidebar-accent/90 active:mt-1 active:border-b-2"
            )}
            >
                <a href={item.href} target="_blank" rel="noopener noreferrer">
                    {buttonContent}
                </a>
            </Button>
        ) : (
            <Button
            asChild
            variant={isActive ? "secondary" : "ghost"}
            className={cn(
                "w-full justify-start gap-3",
                isDraggable ? "pl-8" : "pl-3",
                isCompact ? "h-9 text-sm" : "h-5 text-sm py-1",
                "border-b-4 border-black hover:bg-sidebar-accent/90 active:mt-1 active:border-b-2"
            )}
            >
            <Link href={item.href}>
                {buttonContent}
            </Link>
            </Button>
        )}
       
        {isDraggable && (
            <GripVertical
            className="absolute left-2 top-1/2 -translate-y-1/2 h-5 w-5 text-sidebar-foreground/50 cursor-grab"
            />
        )}
      </div>
    </div>
  );
});

DraggableMenuItemComponent.displayName = "DraggableMenuItem";

export const DraggableMenuItem = React.memo(DraggableMenuItemComponent);
