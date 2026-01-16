
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronsUpDown, Check, LoaderCircle } from 'lucide-react';
import { type Item as InventoryItem } from '@/services/inventory-service';
import { cn } from '@/lib/utils';
import { Label } from '../ui/label';

interface UpdateStockCardProps {
    items: InventoryItem[];
    onItemSelected: (item: InventoryItem) => void;
    isLoading?: boolean;
}

export function UpdateStockCard({ items, onItemSelected, isLoading }: UpdateStockCardProps) {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Update Existing Item Stock</CardTitle>
                <CardDescription>To edit an item details such as quantity and supplers</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <Label>Select Item</Label>
                    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" className="w-full justify-between" disabled={isLoading}>
                                <span className="truncate">Search for an item...</span>
                                {isLoading ? <LoaderCircle className="ml-2 h-4 w-4 animate-spin" /> : <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput placeholder="Search items..." />
                                <CommandList>
                                    <CommandEmpty>No items found.</CommandEmpty>
                                    <CommandGroup>
                                        {items.map((item) => (
                                        <CommandItem
                                            key={item.id}
                                            value={item.name}
                                            onSelect={() => {
                                                onItemSelected(item);
                                                setIsPopoverOpen(false);
                                            }}
                                        >
                                            <Check className={cn("mr-2 h-4 w-4", "opacity-0")} />
                                            {item.name}
                                        </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
            </CardContent>
        </Card>
    );
}
