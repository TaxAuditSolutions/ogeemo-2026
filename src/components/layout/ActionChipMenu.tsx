
"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { type ActionChipData } from '@/types/calendar';
import { cn } from '@/lib/utils';
import { LoaderCircle, Wand2 } from 'lucide-react';

interface ActionChipMenuProps {
    chips: ActionChipData[];
    isLoading: boolean;
}

export function ActionChipMenu({ chips, isLoading }: ActionChipMenuProps) {
    const pathname = usePathname();

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <LoaderCircle className="h-6 w-6 animate-spin" />
            </div>
        );
    }

    if (chips.length === 0) {
        return (
            <div className="text-center text-sm text-muted-foreground p-4">
                <p>No dashboard actions found.</p>
                <Button variant="link" asChild className="p-1 h-auto">
                    <Link href="/action-manager/manage">
                        Add some shortcuts
                    </Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-1">
            {chips.map(chip => {
                const Icon = chip.icon || Wand2; // Use Wand2 as a fallback icon
                const hrefValue = typeof chip.href === 'string' ? chip.href : chip.href?.pathname || '#';
                const isActive = pathname === hrefValue;

                return (
                    <Button
                        key={chip.id}
                        asChild
                        variant={isActive ? "secondary" : "ghost"}
                        className={cn(
                            "w-full justify-start gap-3",
                            "h-5 text-sm py-1 border-b-4 border-transparent hover:border-sidebar-accent/50",
                            isActive ? "border-sidebar-primary" : "border-black"
                        )}
                    >
                        <Link href={chip.href}>
                            <Icon className="h-4 w-4" />
                            <span>{chip.label}</span>
                        </Link>
                    </Button>
                );
            })}
        </div>
    );
}
