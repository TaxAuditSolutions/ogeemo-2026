'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ExternalLink, Link as LinkIcon, Settings2, Star } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/auth-context';
import { openModeFor } from '@/lib/action-links';
import { getActionChips } from '@/services/project-service';
import { type ActionChipData } from '@/types/calendar-types';

interface FavoriteActionsMenuProps {
    /** Return false to keep the user on the current form. */
    onBeforeNavigate?: () => boolean;
}

/** The user's existing My Shortcuts list, without another settings surface. */
export function FavoriteActionsMenu({ onBeforeNavigate }: FavoriteActionsMenuProps) {
    const router = useRouter();
    const { user } = useAuth();
    const [favorites, setFavorites] = React.useState<ActionChipData[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [loadFailed, setLoadFailed] = React.useState(false);

    React.useEffect(() => {
        let cancelled = false;
        const loadFavorites = async () => {
            if (!user?.uid) {
                setFavorites([]);
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                const chips = await getActionChips(user.uid);
                if (!cancelled) {
                    setFavorites(chips);
                    setLoadFailed(false);
                }
            } catch (error) {
                console.error('Failed to load Favorite Actions:', error);
                if (!cancelled) setLoadFailed(true);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        void loadFavorites();
        const handleUpdate = () => { void loadFavorites(); };
        window.addEventListener('chipsUpdated', handleUpdate);
        return () => {
            cancelled = true;
            window.removeEventListener('chipsUpdated', handleUpdate);
        };
    }, [user?.uid]);

    const openLink = (href: ActionChipData['href']) => {
        const { mode, target } = openModeFor(href);
        if (mode === 'none') return;
        if (mode === 'internal') {
            if (onBeforeNavigate && !onBeforeNavigate()) return;
            router.push(target);
        } else {
            window.open(target, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" className="w-full justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                        <Star className="h-4 w-4 shrink-0" />
                        <span className="truncate">Quick actions</span>
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Favorite Actions</DropdownMenuLabel>
                {isLoading ? (
                    <DropdownMenuItem disabled>Loading favorites…</DropdownMenuItem>
                ) : loadFailed ? (
                    <DropdownMenuItem disabled>Favorites could not be loaded.</DropdownMenuItem>
                ) : favorites.length === 0 ? (
                    <DropdownMenuItem disabled>No favorites yet.</DropdownMenuItem>
                ) : favorites.map((chip) => {
                    const Icon = chip.icon || LinkIcon;
                    const { mode } = openModeFor(chip.href);
                    return (
                        <DropdownMenuItem
                            key={chip.id}
                            disabled={mode === 'none'}
                            onSelect={() => openLink(chip.href)}
                            title={mode === 'none' ? 'This shortcut has an invalid destination.' : chip.label}
                        >
                            <Icon className="mr-2 h-4 w-4 shrink-0" />
                            <span className="min-w-0 flex-1 truncate">{chip.label}</span>
                            {mode === 'external' && <ExternalLink className="ml-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                        </DropdownMenuItem>
                    );
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => openLink('/action-manager/manage')}>
                    <Settings2 className="mr-2 h-4 w-4" /> Manage favorites
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
