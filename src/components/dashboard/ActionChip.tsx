
'use client';

import React, { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDrag, useDrop } from 'react-dnd';
import { Button } from '@/components/ui/button';
import { type ActionChipData } from '@/types/calendar';
import { cn } from '@/lib/utils';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const DraggableItemTypes = {
  ACTION_CHIP: 'actionChip',
};

interface ActionChipProps {
  chip: ActionChipData;
  index: number;
  onDelete?: () => void;
  onEdit?: () => void;
  onMove?: (dragIndex: number, hoverIndex: number) => void;
}

export const ActionChip = React.forwardRef<HTMLDivElement, ActionChipProps>(
  ({ chip, index, onDelete, onEdit, onMove }, ref) => {
    const router = useRouter();
    const localRef = useRef<HTMLDivElement>(null);
    const { href, label } = chip;

    const [{ isDragging }, drag] = useDrag({
      type: DraggableItemTypes.ACTION_CHIP,
      item: { ...chip, index },
      collect: (monitor) => ({
        isDragging: !!monitor.isDragging(),
      }),
    });

    const [, drop] = useDrop({
      accept: DraggableItemTypes.ACTION_CHIP,
      hover(item: ActionChipData & { index: number }, monitor) {
        if (!localRef.current || !onMove) {
          return;
        }
        const dragIndex = item.index;
        const hoverIndex = index;

        if (dragIndex === hoverIndex) {
          return;
        }

        const hoverBoundingRect = localRef.current.getBoundingClientRect();
        const clientOffset = monitor.getClientOffset();
        if (!clientOffset) return;

        const hoverClientY = clientOffset.y - hoverBoundingRect.top;
        if (dragIndex < hoverIndex && hoverClientY < hoverBoundingRect.height / 2) {
          return;
        }
        if (dragIndex > hoverIndex && hoverClientY > hoverBoundingRect.height / 2) {
          return;
        }
        
        onMove(dragIndex, hoverIndex);
        item.index = hoverIndex;
      },
    });
    
    drag(drop(localRef));
    
    const handleClick = (e: React.MouseEvent) => {
      if (!href) return;
      
      const hrefValue = typeof href === 'string' ? href : href.pathname;

      if (hrefValue && (hrefValue.startsWith('http://') || hrefValue.startsWith('https://'))) {
        window.open(hrefValue, '_blank', 'noopener,noreferrer');
      } else if (typeof href === 'string') {
        router.push(href);
      } else if (typeof href === 'object' && href.pathname) {
        const query = new URLSearchParams(href.query as Record<string, string>).toString();
        const url = query ? `${href.pathname}?${query}` : href.pathname;
        router.push(url);
      }
    };
    
    return (
      <div
        ref={localRef}
        className={cn(
          'relative group w-full min-w-36 max-w-40',
          isDragging && 'opacity-50'
        )}
      >
        <Button
          onClick={handleClick}
          className={cn(
            "w-full h-6 text-xs justify-center border-b-2 border-black bg-tan text-black",
            "hover:bg-tan/90",
            "active:mt-0.5 active:border-b-0 active:border-black",
            !href && "cursor-default active:mt-0 active:border-b-2",
            (onDelete || onEdit) && "pr-8" // Add padding if menu is present
          )}
        >
          <span className="truncate">{label}</span>
        </Button>
        {(onDelete || onEdit) && (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1/2 right-1 -translate-y-1/2 h-5 w-5"
                    >
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">More options for {label}</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    {onEdit && (
                        <DropdownMenuItem onSelect={onEdit}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                    )}
                    {onDelete && (
                         <DropdownMenuItem onSelect={onDelete} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        )}
      </div>
    );
  }
);

ActionChip.displayName = 'ActionChip';
