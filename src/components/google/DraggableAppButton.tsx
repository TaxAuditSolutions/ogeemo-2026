
"use client";

import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Button } from '@/components/ui/button';
import { ExternalLink, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type GoogleApp } from '@/lib/google-apps';

interface DraggableAppButtonProps {
    app: GoogleApp;
    index: number;
    moveApp: (dragIndex: number, hoverIndex: number) => void;
}

interface DragItem {
    index: number;
}

export const DraggableAppButton = ({ app, index, moveApp }: DraggableAppButtonProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const Icon = app.icon;

    const [{ isDragging }, drag] = useDrag({
        type: 'APP_BUTTON',
        item: () => ({ index }),
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    const [, drop] = useDrop({
        accept: 'APP_BUTTON',
        hover(item: DragItem, monitor) {
            if (!ref.current) return;

            const dragIndex = item.index;
            const hoverIndex = index;

            if (dragIndex === hoverIndex) return;
            
            moveApp(dragIndex, hoverIndex);
            item.index = hoverIndex;
        },
    });

    drag(drop(ref));

    return (
        <div ref={ref} className={cn("relative", isDragging && "opacity-50")}>
            <Button asChild className="w-full justify-start pl-8 border-b-4 border-primary/70 bg-primary text-primary-foreground hover:bg-primary/90 active:mt-1 active:border-b-2 active:border-primary/90">
                <a href={app.href} target="_blank" rel="noopener noreferrer">
                    <Icon className="mr-2 h-6 w-6" /> {app.name} <ExternalLink className="ml-auto h-3 w-3" />
                </a>
            </Button>
            <GripVertical className="absolute left-2 top-1/2 -translate-y-1/2 h-5 w-5 text-primary-foreground/70 cursor-move" />
        </div>
    );
};
