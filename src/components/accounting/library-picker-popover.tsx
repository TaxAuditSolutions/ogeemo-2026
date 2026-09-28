'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronsUpDown, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { type ServiceItem } from '@/core/accounting-service';

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

interface LibraryPickerPopoverProps {
    serviceItems: ServiceItem[];
    onSelect: (service: ServiceItem) => void;
    /** Seeds the search box with text already typed into the description input. */
    searchValue?: string;
}

/**
 * Searchable picker for the Products & Services library, used by the invoice
 * and quote line-item Description cells. Selecting an item hands the full
 * ServiceItem back so the caller can auto-fill price, tax, and the library link.
 * The description input itself stays free-text; this is the browse affordance.
 */
export function LibraryPickerPopover({ serviceItems, onSelect, searchValue = '' }: LibraryPickerPopoverProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                    title="Select from Products & Services"
                >
                    <ChevronsUpDown className="h-4 w-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[360px] p-0">
                <Command>
                    <CommandInput
                        placeholder="Search Products & Services library..."
                        defaultValue={searchValue}
                        className="h-9"
                    />
                    <CommandList>
                        {serviceItems.length === 0 ? (
                            <CommandEmpty className="px-3 py-2 text-center text-xs italic text-muted-foreground">
                                No library items yet &mdash; add them in Products &amp; Services.
                            </CommandEmpty>
                        ) : (
                            <>
                                <CommandEmpty className="px-3 py-2 text-center text-xs italic text-muted-foreground">
                                    No matches &mdash; your typed text will be kept as the description.
                                </CommandEmpty>
                                <CommandGroup heading="Library">
                                    {serviceItems.map(s => (
                                        <CommandItem
                                            key={s.id}
                                            value={s.description}
                                            onSelect={() => {
                                                onSelect(s);
                                                setIsOpen(false);
                                            }}
                                            className="cursor-pointer"
                                        >
                                            <div className="flex min-w-0 flex-1 flex-col">
                                                <span className="truncate text-sm font-semibold">{s.description}</span>
                                                <span className="font-mono text-[11px] text-muted-foreground">
                                                    {formatCurrency(s.price)}
                                                    {s.taxType && s.taxType !== 'None' ? ` • Tax: ${s.taxType}` : ''}
                                                </span>
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
                <div className="border-t p-1.5">
                    <Link
                        href="/accounting/service-items"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                        <Settings className="h-3.5 w-3.5" />
                        Manage Products &amp; Services library
                    </Link>
                </div>
            </PopoverContent>
        </Popover>
    );
}
