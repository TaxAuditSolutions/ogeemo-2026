
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronsUpDown, Check, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { type Item as InventoryItem } from '@/services/inventory-service';
import { cn } from '@/lib/utils';


interface AddInventoryItemCardProps {
  onItemAdded: () => void;
  inventoryItems: InventoryItem[];
  onItemSelected: (item: InventoryItem) => void;
}

export function AddInventoryItemCard({ onItemAdded, inventoryItems, onItemSelected }: AddInventoryItemCardProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const { toast } = useToast();

  const handleSelect = (item: InventoryItem) => {
    onItemSelected(item);
    setIsPopoverOpen(false);
    setSearchValue("");
  };

  const handleAddNew = () => {
    onItemSelected(null);
    setIsPopoverOpen(false);
    setSearchValue("");
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Update Stock</CardTitle>
        <CardDescription>Search for an item to quickly update its stock levels.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" className="w-full justify-between">
              <span className="truncate">{searchValue || "Search item..."}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command>
              <CommandInput
                placeholder="Search item name..."
                value={searchValue}
                onValueChange={setSearchValue}
              />
              <CommandList>
                <CommandEmpty>No item found.</CommandEmpty>
                <CommandGroup>
                  {inventoryItems.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.name}
                      onSelect={() => handleSelect(item)}
                    >
                      {item.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </CardContent>
      <CardFooter>
        <Button onClick={handleAddNew} className="w-full">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Item
        </Button>
      </CardFooter>
    </Card>
  );
}
