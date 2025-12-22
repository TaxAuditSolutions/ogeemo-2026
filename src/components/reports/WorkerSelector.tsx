
'use client';

import React, { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { ChevronsUpDown, Check, User, LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Worker } from '@/services/payroll-service';

interface WorkerSelectorProps {
  workers: Worker[];
  selectedWorkerId: string | null;
  onSelect: (workerId: string | null) => void;
  isLoading: boolean;
}

export function WorkerSelector({ workers, selectedWorkerId, onSelect, isLoading }: WorkerSelectorProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const selectedWorker = workers.find(w => w.id === selectedWorkerId);

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-64 justify-between">
          <User className="mr-2 h-4 w-4" />
          {selectedWorker ? (
            <span className="truncate">{selectedWorker.name}</span>
          ) : (
            "Select Worker..."
          )}
          {isLoading ? (
            <LoaderCircle className="ml-2 h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0">
        <Command>
          <CommandInput placeholder="Search workers..." />
          <CommandList>
            <CommandEmpty>No worker found.</CommandEmpty>
            <CommandGroup>
              {workers.map((worker) => (
                <CommandItem
                  key={worker.id}
                  value={worker.name}
                  onSelect={() => {
                    onSelect(worker.id);
                    setIsPopoverOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedWorkerId === worker.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {worker.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
