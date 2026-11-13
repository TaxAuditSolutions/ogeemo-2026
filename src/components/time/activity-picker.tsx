'use client';

import React from 'react';
import { format } from 'date-fns';
import { Check, ChevronsUpDown, Clock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getActivityPickerResults } from '@/lib/activity-picker';
import { cn } from '@/lib/utils';
import { type Event as TaskEvent } from '@/types/calendar-types';

interface ActivityPickerProps {
    activities: TaskEvent[];
    projects: Array<{ id: string; name: string }>;
    contacts: Array<{ id: string; name: string }>;
    selectedActivityId: string | null;
    isLoading: boolean;
    onSelect: (activityId: string) => boolean | void;
}

function activityTypeLabel(activity: TaskEvent): string {
    switch (activity.activityType) {
        case 'appointment': return 'Appointment';
        case 'project': return 'Project';
        case 'note': return 'Note';
        default: return 'Action';
    }
}

export function ActivityPicker({ activities, projects, contacts, selectedActivityId, isLoading, onSelect }: ActivityPickerProps) {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState('');
    const [showCompleted, setShowCompleted] = React.useState(false);

    const names = React.useMemo(() => {
        const result = new Map<string, string>();
        projects.forEach((project) => result.set(`project:${project.id}`, project.name));
        contacts.forEach((contact) => result.set(`contact:${contact.id}`, contact.name));
        return result;
    }, [projects, contacts]);

    const searchText = React.useCallback((activity: TaskEvent) => [
        activity.projectId ? names.get(`project:${activity.projectId}`) : '',
        activity.contactId ? names.get(`contact:${activity.contactId}`) : '',
    ].filter(Boolean).join(' '), [names]);

    const results = React.useMemo(() => getActivityPickerResults(activities, {
        query,
        showCompleted,
        searchText,
    }), [activities, query, showCompleted, searchText]);

    const selected = activities.find((activity) => activity.id === selectedActivityId);
    const selectedTitle = selected?.title.trim() || (selected ? 'Untitled activity' : null);

    const chooseActivity = (activityId: string) => {
        if (onSelect(activityId) === false) return;
        setOpen(false);
        setQuery('');
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    aria-label="Select an existing activity"
                    className="w-full min-w-0 justify-between gap-2"
                >
                    <span className={cn('min-w-0 truncate', !selectedTitle && 'text-muted-foreground')}>
                        {selectedTitle || 'Select an existing activity…'}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[420px] max-w-[calc(100vw-2rem)] p-0">
                <Command shouldFilter={false}>
                    <CommandInput
                        value={query}
                        onValueChange={setQuery}
                        placeholder="Search by subject, notes, client, or project…"
                        aria-label="Search activities"
                    />
                    <CommandList>
                        <CommandEmpty>
                            {isLoading ? 'Loading activities…' : query.trim() ? 'No activities match your search.' : 'No activities to show.'}
                        </CommandEmpty>
                        <CommandGroup heading={showCompleted ? 'Activities' : 'Open activities'}>
                            {results.map((activity) => {
                                const title = activity.title.trim() || 'Untitled activity';
                                const linkedNames = searchText(activity);
                                return (
                                    <CommandItem
                                        key={activity.id}
                                        value={`${activity.id} ${title}`}
                                        onSelect={() => chooseActivity(activity.id)}
                                        className="items-start gap-2 py-2"
                                    >
                                        <Check className={cn('mt-0.5 h-4 w-4 shrink-0', selectedActivityId === activity.id ? 'opacity-100' : 'opacity-0')} />
                                        <span className="min-w-0 flex-1">
                                            <span className={cn('block truncate font-medium', activity.status === 'done' && 'line-through text-muted-foreground')}>
                                                {title}
                                            </span>
                                            <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                                <Clock className="h-3 w-3 shrink-0" />
                                                <span className="truncate">
                                                    {activity.start instanceof Date ? format(activity.start, 'MMM d, yyyy · h:mm a') : 'No set time'}
                                                </span>
                                            </span>
                                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                                {activityTypeLabel(activity)}
                                                {activity.status === 'done' ? ' · Completed' : activity.status === 'inProgress' ? ' · In progress' : ''}
                                                {linkedNames ? ` · ${linkedNames}` : ''}
                                            </span>
                                        </span>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
                <div className="border-t p-3">
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <Checkbox
                            id="show-completed-activities"
                            checked={showCompleted}
                            onCheckedChange={(checked) => setShowCompleted(checked === true)}
                        />
                        <span>Show completed activities</span>
                    </label>
                </div>
            </PopoverContent>
        </Popover>
    );
}
