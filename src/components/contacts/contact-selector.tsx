
'use client';

import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronsUpDown, Check, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Contact } from '@/services/contact-service';

interface ContactSelectorProps {
  contacts: Contact[];
  selectedContactId: string | null;
  onSelectContact: (contactId: string | null) => void;
  className?: string;
}

export function ContactSelector({ contacts, selectedContactId, onSelectContact, className }: ContactSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedContact = contacts.find(c => c.id === selectedContactId);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn("w-64 justify-between", className)}
        >
          <User className="mr-2 h-4 w-4" />
          {selectedContact ? (
            <span className="truncate">{selectedContact.name}</span>
          ) : (
            "Select contact..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search contacts..." />
          <CommandList>
            <CommandEmpty>No contact found.</CommandEmpty>
            <CommandGroup>
              <CommandItem onSelect={() => { onSelectContact(null); setIsOpen(false); }}>
                <Check className={cn("mr-2 h-4 w-4", !selectedContactId ? "opacity-100" : "opacity-0")} />
                All Contacts
              </CommandItem>
              {contacts.map((contact) => (
                <CommandItem
                  key={contact.id}
                  value={contact.name}
                  onSelect={() => {
                    onSelectContact(contact.id);
                    setIsOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedContactId === contact.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {contact.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
