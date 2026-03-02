
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useDrag, useDrop } from 'react-dnd';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoaderCircle, ArrowLeft, ArrowDownAZ, ArrowUpZA, Save, GripVertical } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { allMenuItems, type MenuItem } from '@/lib/menu-items';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { cn } from '@/lib/utils';

interface DraggableItemProps {
    item: MenuItem;
    index: number;
    moveMenuItem: (dragIndex: number, hoverIndex: number) => void;
}

const DraggableMenuItem = ({ item, index, moveMenuItem }: DraggableItemProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const Icon = item.icon;

    const [{ isDragging }, drag] = useDrag({
        type: 'MENU_ITEM_SORT',
        item: () => ({ href: item.href, index }),
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }, [item.href, index]);

    const [, drop] = useDrop({
        accept: 'MENU_ITEM_SORT',
        hover(draggedItem: { index: number }, monitor) {
            if (!ref.current) return;

            const dragIndex = draggedItem.index;
            const hoverIndex = index;
            if (dragIndex === hoverIndex) return;

            moveMenuItem(dragIndex, hoverIndex);
            draggedItem.index = hoverIndex;
        },
    }, [index, moveMenuItem]);
    
    drag(drop(ref));

    return (
        <div
            ref={ref}
            className={cn(
                "flex items-center gap-2 p-2 rounded-md",
                'bg-primary text-primary-foreground border-b-4 border-primary/70 hover:bg-primary/90 active:mt-1 active:border-b-2 active:border-primary/90',
                isDragging && 'opacity-50'
            )}
        >
            <GripVertical className="h-5 w-5 cursor-move text-primary-foreground/70" />
            <Icon className="h-4 w-4 text-primary-foreground/90" />
            <span className="text-sm">{item.label}</span>
        </div>
    );
};


export function AZSortView() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const { preferences, updatePreferences, isLoading: isLoadingPrefs } = useUserPreferences();

  useEffect(() => {
    if (!isLoadingPrefs && preferences) {
        const savedOrder = preferences.menuOrder;
        
        if (savedOrder && savedOrder.length > 0) {
            const orderedItems = savedOrder
                .map(href => allMenuItems.find(item => item.href === href))
                .filter(Boolean) as MenuItem[];
            const remainingItems = allMenuItems.filter(item => !savedOrder.includes(item.href));
            setMenuItems([...orderedItems, ...remainingItems]);
        } else {
            setMenuItems([...allMenuItems].sort((a, b) => a.label.localeCompare(b.label)));
        }
        setIsLoading(false);
    }
  }, [preferences, isLoadingPrefs]);

  const handleSort = (direction: 'asc' | 'desc') => {
    const sorted = [...menuItems].sort((a, b) => {
        return direction === 'asc' 
            ? a.label.localeCompare(b.label) 
            : b.label.localeCompare(a.label);
    });
    setMenuItems(sorted);
  };

  const moveMenuItem = useCallback((dragIndex: number, hoverIndex: number) => {
    setMenuItems((prevItems) => {
        const newItems = [...prevItems];
        const [draggedItem] = newItems.splice(dragIndex, 1);
        newItems.splice(hoverIndex, 0, draggedItem);
        return newItems;
    });
  }, []);

  const handleSaveChanges = async () => {
    if (!user) return;
    try {
        const orderToSave = menuItems.map(item => item.href);
        // Using updatePreferences ensures only the menuOrder is sent to the backend,
        // avoiding permission errors caused by sending protected fields like 'role'.
        await updatePreferences({ menuOrder: orderToSave });
        
        // Dispatch custom event to notify the sidebar to update
        window.dispatchEvent(new CustomEvent('menuOrderChanged'));

        toast({
            title: "Menu Order Saved",
            description: "Your new menu order has been saved and the sidebar has been updated."
        });
    } catch (error: any) {
        // The service already handles the "red card" error display via errorEmitter.
        // We catch here just to prevent unhandled promise rejection in the UI.
    }
  };

  if (isLoading || isLoadingPrefs) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
        <header className="text-center">
            <h1 className="text-2xl font-bold font-headline text-primary">A-Z Sort Manager</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
                Sort your main menu managers alphabetically or drag and drop to create a custom order.
            </p>
        </header>

        <Card className="max-w-4xl mx-auto">
            <CardHeader className="text-center">
                <CardTitle>Sort Menu Items</CardTitle>
                <CardDescription>
                    Click the buttons to sort your menu, or drag items to reorder them. Press "Save New Order" to apply the changes to your sidebar.
                </CardDescription>
                 <div className="flex justify-center gap-2 pt-2">
                    <Button asChild variant="outline">
                        <Link href="/action-manager"><ArrowLeft className="mr-2 h-4 w-4"/> Back to Action Manager</Link>
                    </Button>
                    <Button onClick={() => handleSort('asc')}><ArrowDownAZ className="mr-2 h-4 w-4" /> Sort A-Z</Button>
                    <Button onClick={() => handleSort('desc')}><ArrowUpZA className="mr-2 h-4 w-4" /> Sort Z-A</Button>
                    <Button onClick={handleSaveChanges}>
                        <Save className="mr-2 h-4 w-4" /> Save New Order
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="min-h-[200px]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-4 border rounded-lg">
                    {menuItems.map((item, index) => (
                        <DraggableMenuItem
                            key={item.href}
                            item={item}
                            index={index}
                            moveMenuItem={moveMenuItem}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
