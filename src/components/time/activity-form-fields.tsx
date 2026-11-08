'use client';

import * as React from 'react';
import Link from 'next/link';
import { format as formatDate, isToday, isTomorrow, set } from 'date-fns';
import {
    Calendar as CalendarIcon,
    Check,
    CheckCircle2,
    ChevronDown,
    Circle,
    Clock,
    FileText,
    Folder,
    MoreVertical,
    Plus,
    Search,
    Users as UsersIcon,
    X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import ContactFormDialog from '@/components/contacts/contact-form-dialog';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { type ActivityFormState } from '@/hooks/use-activity-form';
import { type ActivityReferenceData } from '@/hooks/use-activity-reference-data';
import { buildProjectGroups, statusLabel, PROJECT_SORT_MODES, type ProjectSortMode } from '@/lib/project-picker';
import { endFollowsStart } from '@/lib/schedule-dates';
import { formatDurationMinutes } from '@/lib/next-free-slot';
import { cn } from '@/lib/utils';
import { addProject } from '@/services/project-service';
import { type ActivityType, type TaskStatus } from '@/types/calendar-types';
import { type Contact } from '@/services/contact-service';

// The three capture tiles at the top of the form. A tile sets
// Event.activityType; every field stays available. "Action" covers both
// tasks and appointments - whether it has a time is the When band's job.
// Clicking Action on a new form stores 'task'; an existing 'appointment'
// stays an appointment (it still shows as selected and is never changed
// by merely opening it), so the calendar's overdue rule keeps working.
const ACTIVITY_TYPES: {
    value: ActivityType;
    matches: ActivityType[];
    label: string;
    caption: string;
    Icon: React.ComponentType<{ className?: string }>;
}[] = [
    { value: 'task', matches: ['task', 'appointment'], label: 'Action', caption: 'Something to do or attend', Icon: CheckCircle2 },
    { value: 'project', matches: ['project'], label: 'Project', caption: 'Larger piece of work', Icon: Folder },
    { value: 'note', matches: ['note'], label: 'Note', caption: 'Conversation or record', Icon: FileText },
];

// Colour identification for the activity type. The selected tile and the
// Subject field read the same entry, so they always match. All four types
// share light tan for now; give a type its own colour by editing its entry.
const TYPE_TAN = 'border-[#e8d8bc] bg-[#faf4e8] dark:border-[#7a6544] dark:bg-[#3d3220]';
const ACTIVITY_TYPE_COLORS: Record<ActivityType, string> = {
    task: TYPE_TAN,
    appointment: TYPE_TAN,
    project: TYPE_TAN,
    note: TYPE_TAN,
};

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
    { value: 'todo', label: 'To Do' },
    { value: 'inProgress', label: 'In Progress' },
    { value: 'done', label: 'Done' },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
    value: String(i).padStart(2, '0'),
    label: formatDate(set(new Date(), { hours: i }), 'h a'),
}));

const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, i) => {
    const minutes = i * 5;
    return { value: String(minutes).padStart(2, '0'), label: `:${String(minutes).padStart(2, '0')}` };
});

interface ActivityFormFieldsProps {
    form: ActivityFormState;
    data: ActivityReferenceData;
    subjectInputRef?: React.Ref<HTMLInputElement>;
    /** When provided, a "More tools" menu (Meeting Agenda, Calendar link) is shown beside Notes. */
    onOpenAgenda?: () => void;
}

/**
 * The Activity Manager's single-card form: activity type tiles, subject,
 * client / project / assignee pickers, notes, and the Schedule / Billable /
 * Status controls. Rendered by the Activity Manager page and by the Calendar's
 * Add dialog; each host supplies its own footer and save handling.
 */
export function ActivityFormFields({ form, data, subjectInputRef, onOpenAgenda }: ActivityFormFieldsProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const {
        subject, setSubject,
        notes, setNotes,
        activityType,
        status, setStatus,
        selectedProjectId, setSelectedProjectId,
        selectedContactId, setSelectedContactId,
        selectedWorkerId, setSelectedWorkerId,
        isBillable, setIsBillable,
        billableRate, setBillableRate,
        isScheduleEnabled,
        startDate, setStartDate,
        startHour, setStartHour,
        startMinute, setStartMinute,
        endDate, setEndDate,
        endHour, setEndHour,
        endMinute, setEndMinute,
        isAllDay, setIsAllDay,
        startDateTouchedRef,
        startTimeTouchedRef,
        handleActivityTypeSelect,
        isSlotSuggested, setIsSlotSuggested,
        selectNextFreeSlot,
        selectPickTime,
        selectNoSetTime,
        scheduledMinutes,
    } = form;
    const {
        projects, setProjects,
        contacts, setContacts,
        contactFolders, setContactFolders,
        companies, setCompanies,
        customIndustries, setCustomIndustries,
        workers,
        isLoading: isLoadingData,
    } = data;

    const [isContactFormOpen, setIsContactFormOpen] = React.useState(false);
    const [isContactPopoverOpen, setIsContactPopoverOpen] = React.useState(false);
    const [isProjectPopoverOpen, setIsProjectPopoverOpen] = React.useState(false);
    const [isWorkerPopoverOpen, setIsWorkerPopoverOpen] = React.useState(false);
    const [isStartPickerOpen, setIsStartPickerOpen] = React.useState(false);
    const [isEndPickerOpen, setIsEndPickerOpen] = React.useState(false);
    const [newProjectName, setNewProjectName] = React.useState('');
    // Project picker ordering (beta feedback: selection must stay simple as
    // project counts grow). Session-local for now; promote to a saved
    // preference only if the Projects/Activity Manager audit asks for it.
    const [projectSortMode, setProjectSortMode] = React.useState<ProjectSortMode>('active');

    const contactNameById = React.useMemo(() => new Map(contacts.map((c) => [c.id, c.name])), [contacts]);
    const projectGroups = React.useMemo(
        () =>
            buildProjectGroups(
                projects,
                contactNameById,
                projectSortMode,
                contacts.find((c) => c.id === selectedContactId)?.name ?? null,
            ),
        [projects, contactNameById, projectSortMode, contacts, selectedContactId],
    );
    const selectedWorker = workers.find((w) => w.id === selectedWorkerId) || workers.find((w) => w.id === user?.uid);
    const emptyResultsLabel = isLoadingData ? 'Loading…' : 'No results.';

    // "When" band: which of the three choices is active, and a readable summary.
    const whenMode: 'next' | 'pick' | 'none' = !isScheduleEnabled ? 'none' : isSlotSuggested ? 'next' : 'pick';
    const startMoment = startDate && startHour && startMinute
        ? set(startDate, { hours: parseInt(startHour, 10), minutes: parseInt(startMinute, 10), seconds: 0, milliseconds: 0 })
        : null;
    const endMoment = endDate && endHour && endMinute
        ? set(endDate, { hours: parseInt(endHour, 10), minutes: parseInt(endMinute, 10), seconds: 0, milliseconds: 0 })
        : null;
    const dayLabel = (d: Date) => (isToday(d) ? 'Today' : isTomorrow(d) ? 'Tomorrow' : formatDate(d, 'EEE, MMM d'));
    const timeSummary = isAllDay
        ? 'All day'
        : startMoment
            ? `${formatDate(startMoment, 'h:mm a')}${endMoment ? ` \u2192 ${formatDate(endMoment, 'h:mm a')}` : ''}`
            : '';
    // A user edit of the time turns "Next free slot" into "Pick a time".
    const markTimeChosen = () => setIsSlotSuggested(false);

    const handleCreateProject = async () => {
        if (!user || !newProjectName.trim()) return;
        try {
            const newProject = await addProject({ name: newProjectName, userId: user.uid, status: 'planning', createdAt: new Date() });
            setProjects((prev) => [newProject, ...prev]);
            setSelectedProjectId(newProject.id);
            setNewProjectName('');
            setIsProjectPopoverOpen(false);
            toast({ title: 'Project Created' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const handleContactSave = (savedContact: Contact, isEditing: boolean) => {
        if (isEditing) {
            setContacts((prev) => prev.map((c) => (c.id === savedContact.id ? savedContact : c)));
        } else {
            setContacts((prev) => [...prev, savedContact]);
        }
        setSelectedContactId(savedContact.id);
        setIsContactFormOpen(false);
    };

    return (
        <>
            <div className="space-y-6">
                {/* Activity type tiles: Action / Project / Note */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {ACTIVITY_TYPES.map(({ value, matches, label, caption, Icon }) => {
                        const isSelected = matches.includes(activityType);
                        return (
                            <button
                                key={value}
                                type="button"
                                onClick={() => { if (!isSelected) handleActivityTypeSelect(value); }}
                                aria-pressed={isSelected}
                                className={cn(
                                    'flex items-center gap-3 rounded-lg border p-4 text-left transition-colors',
                                    isSelected ? ACTIVITY_TYPE_COLORS[value] : 'border-border bg-card hover:bg-muted/50'
                                )}
                            >
                                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground')}>
                                    <Icon className="h-5 w-5" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-sm font-semibold">{label}</span>
                                    <span className="block text-xs text-muted-foreground">{caption}</span>
                                </span>
                            </button>
                        );
                    })}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="subject">Subject <span className="text-destructive">*</span></Label>
                    <Input id="subject" className={cn('transition-colors', ACTIVITY_TYPE_COLORS[activityType])} placeholder="e.g. Prepare design concept" value={subject} onChange={(e) => setSubject(e.target.value)} ref={subjectInputRef} />
                </div>
                {/* When: the time is part of the activity, so it sits right under the Subject. */}
                <div className={cn('space-y-3 rounded-lg border p-4 transition-colors', whenMode !== 'none' ? ACTIVITY_TYPE_COLORS.task : 'border-border bg-card')}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <Label className="text-sm font-semibold">When</Label>
                            {whenMode !== 'none' && startDate && (
                                <span className="text-sm">
                                    <span className="font-medium">{dayLabel(startDate)}</span>
                                    {timeSummary && <span> · {timeSummary}</span>}
                                    {!isAllDay && scheduledMinutes > 0 && <span className="text-muted-foreground"> ({formatDurationMinutes(scheduledMinutes)})</span>}
                                </span>
                            )}
                            {whenMode === 'none' && <span className="text-sm text-muted-foreground">No set time</span>}
                        </div>
                        <div className="inline-flex rounded-md border bg-background p-0.5" role="group" aria-label="When">
                            {([
                                { key: 'next', label: 'Next free slot', onClick: () => { selectNextFreeSlot(); } },
                                { key: 'pick', label: 'Pick a time', onClick: selectPickTime },
                                { key: 'none', label: 'No set time', onClick: selectNoSetTime },
                            ] as const).map((choice) => (
                                <Button
                                    key={choice.key}
                                    type="button"
                                    size="sm"
                                    variant={whenMode === choice.key ? 'secondary' : 'ghost'}
                                    aria-pressed={whenMode === choice.key}
                                    className="h-7 px-3 text-xs"
                                    onClick={choice.onClick}
                                >
                                    {choice.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                    {whenMode === 'next' && (
                        <p className="text-xs text-muted-foreground">Suggested from your calendar. Change the day or time below if it doesn&apos;t suit.</p>
                    )}
                    {isScheduleEnabled && (
                        <div className="space-y-3 animate-in fade-in-50">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label className="text-xs">Start</Label>
                                    <Popover open={isStartPickerOpen} onOpenChange={setIsStartPickerOpen}>
                                        <PopoverTrigger asChild><Button variant="outline" className="w-full justify-start bg-background text-xs font-normal">{startDate ? formatDate(startDate, 'PP') : 'Date'}</Button></PopoverTrigger>
                                        <PopoverContent className="w-auto p-0"><CustomCalendar mode="single" selected={startDate} onSelect={d => { markTimeChosen(); startDateTouchedRef.current = true; const follow = endFollowsStart(startDate, endDate); setStartDate(d); if (follow) setEndDate(d); setIsStartPickerOpen(false); }} initialFocus /></PopoverContent>
                                    </Popover>
                                    <div className="flex gap-1">
                                        <Select value={startHour} onValueChange={(v) => { markTimeChosen(); startTimeTouchedRef.current = true; setStartHour(v); }} disabled={isAllDay}>
                                            <SelectTrigger className="h-8 bg-background text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>{HOUR_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <Select value={startMinute} onValueChange={(v) => { markTimeChosen(); startTimeTouchedRef.current = true; setStartMinute(v); }} disabled={isAllDay}>
                                            <SelectTrigger className="h-8 bg-background text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>{MINUTE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">End</Label>
                                    <Popover open={isEndPickerOpen} onOpenChange={setIsEndPickerOpen}>
                                        <PopoverTrigger asChild><Button variant="outline" className="w-full justify-start bg-background text-xs font-normal">{endDate ? formatDate(endDate, 'PP') : 'Date'}</Button></PopoverTrigger>
                                        <PopoverContent className="w-auto p-0"><CustomCalendar mode="single" selected={endDate} onSelect={d => { markTimeChosen(); setEndDate(d); setIsEndPickerOpen(false); }} initialFocus /></PopoverContent>
                                    </Popover>
                                    <div className="flex gap-1">
                                        <Select value={endHour || ''} onValueChange={(v) => { markTimeChosen(); setEndHour(v); }} disabled={isAllDay}>
                                            <SelectTrigger className="h-8 bg-background text-xs"><SelectValue placeholder="Hr" /></SelectTrigger>
                                            <SelectContent>{HOUR_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <Select value={endMinute || ''} onValueChange={(v) => { markTimeChosen(); setEndMinute(v); }} disabled={isAllDay}>
                                            <SelectTrigger className="h-8 bg-background text-xs"><SelectValue placeholder="Min" /></SelectTrigger>
                                            <SelectContent>{MINUTE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="all-day" checked={isAllDay} onCheckedChange={(v) => { markTimeChosen(); setIsAllDay(!!v); }} />
                                <Label htmlFor="all-day" className="text-xs">All-day</Label>
                            </div>
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label className="text-sm">Client <span className="font-normal text-muted-foreground">(optional)</span></Label>
                        <Popover open={isContactPopoverOpen} onOpenChange={setIsContactPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={isContactPopoverOpen}
                                    className="w-full justify-start gap-2 font-normal h-10"
                                >
                                    <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span className={cn('truncate', selectedContactId ? 'text-foreground' : 'text-muted-foreground')}>
                                        {contacts.find(c => c.id === selectedContactId)?.name || 'Search by contact...'}
                                    </span>
                                    <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Search clients..." />
                                    <CommandList>
                                        <CommandEmpty>{emptyResultsLabel}</CommandEmpty>
                                        <CommandGroup>
                                            {contacts.map(c => (
                                                <CommandItem key={c.id} value={`${c.name} ${c.id}`} onSelect={() => { setSelectedContactId(c.id); setIsContactPopoverOpen(false); }}>
                                                    <Check className={cn("mr-2 h-4 w-4", selectedContactId === c.id ? "opacity-100" : "opacity-0")} />{c.name}
                                                </CommandItem>
                                            ))}
                                            {selectedContactId && (
                                                <CommandItem onSelect={() => { setSelectedContactId(null); setIsContactPopoverOpen(false); }}>
                                                    <X className="mr-2 h-4 w-4" /> Clear client
                                                </CommandItem>
                                            )}
                                            <CommandItem onSelect={() => { setIsContactPopoverOpen(false); setIsContactFormOpen(true); }}>
                                                <Plus className="mr-2 h-4 w-4" /> Add new contact…
                                            </CommandItem>
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm">Project <span className="font-normal text-muted-foreground">(optional)</span></Label>
                        <Popover open={isProjectPopoverOpen} onOpenChange={setIsProjectPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={isProjectPopoverOpen}
                                    className={cn(
                                        'w-full justify-start gap-2 font-normal h-10 transition-colors',
                                        activityType === 'project' && cn(ACTIVITY_TYPE_COLORS.project, 'hover:bg-[#f5ecd9] dark:hover:bg-[#4a3d28]')
                                    )}
                                >
                                    <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span className={cn('truncate', selectedProjectId ? 'text-foreground' : 'text-muted-foreground')}>
                                        {projects.find(p => p.id === selectedProjectId)?.name || 'Search by project...'}
                                    </span>
                                    <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start">
                                <div className="flex items-center gap-1 border-b p-2">
                                    {PROJECT_SORT_MODES.map((mode) => (
                                        <Button key={mode.value} type="button" variant={projectSortMode === mode.value ? 'secondary' : 'ghost'} size="sm" className="h-7 flex-1 px-2 text-xs" onClick={() => setProjectSortMode(mode.value)}>
                                            {mode.label}
                                        </Button>
                                    ))}
                                </div>
                                <Command>
                                    <CommandInput placeholder="Search projects or clients..." />
                                    <CommandList>
                                        <CommandEmpty>{emptyResultsLabel}</CommandEmpty>
                                        {projectGroups.map((group) => (
                                            <CommandGroup key={group.key} heading={group.label}>
                                                {group.items.map(({ project: p, contactName, status }) => (
                                                    <CommandItem
                                                        key={p.id}
                                                        value={`${p.name} ${contactName} ${statusLabel(status)} ${p.id}`}
                                                        onSelect={() => { setSelectedProjectId(p.id); setIsProjectPopoverOpen(false); }}
                                                        className={group.subdued ? 'opacity-60' : undefined}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", selectedProjectId === p.id ? "opacity-100" : "opacity-0")} />
                                                        <span className="flex min-w-0 flex-col">
                                                            <span className="truncate">{p.name}</span>
                                                            {(contactName || statusLabel(status)) && (
                                                                <span className="truncate text-[10px] text-muted-foreground">
                                                                    {[contactName, statusLabel(status)].filter(Boolean).join(' · ')}
                                                                </span>
                                                            )}
                                                        </span>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        ))}
                                        {selectedProjectId && (
                                            <CommandGroup>
                                                <CommandItem onSelect={() => { setSelectedProjectId(null); setIsProjectPopoverOpen(false); }}>
                                                    <X className="mr-2 h-4 w-4" /> Clear project
                                                </CommandItem>
                                            </CommandGroup>
                                        )}
                                    </CommandList>
                                </Command>
                                <div className="flex gap-1 border-t p-2">
                                    <Input placeholder="New project name…" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} className="h-8 text-xs" />
                                    <Button onClick={handleCreateProject} size="sm" className="h-8" disabled={!newProjectName.trim()}>Create</Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm">Assign to <span className="font-normal text-muted-foreground">(optional)</span></Label>
                        <Popover open={isWorkerPopoverOpen} onOpenChange={setIsWorkerPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={isWorkerPopoverOpen}
                                    className="w-full justify-start gap-2 font-normal h-10"
                                >
                                    <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span className={cn('truncate', selectedWorkerId ? 'text-foreground' : 'text-muted-foreground')}>
                                        {selectedWorker?.name || 'Search by worker...'}
                                    </span>
                                    <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Search workers..." />
                                    <CommandList>
                                        <CommandEmpty>{isLoadingData ? 'Loading…' : 'No worker found.'}</CommandEmpty>
                                        <CommandGroup>
                                            <CommandItem onSelect={() => { setSelectedWorkerId(user?.uid || null); setIsWorkerPopoverOpen(false); }}>
                                                <Check className={cn("mr-2 h-4 w-4", selectedWorkerId === user?.uid ? "opacity-100" : "opacity-0")} />
                                                Me (Admin)
                                            </CommandItem>
                                            {workers.map(w => (
                                                <CommandItem key={w.id} value={`${w.name} ${w.jobRole || ''} ${w.workerType || ''} ${w.id}`} onSelect={() => { setSelectedWorkerId(w.id); setIsWorkerPopoverOpen(false); }}>
                                                    <Check className={cn("mr-2 h-4 w-4", selectedWorkerId === w.id ? "opacity-100" : "opacity-0")} />
                                                    <span className="flex min-w-0 flex-col">
                                                        <span className="truncate">{w.name}</span>
                                                        {(w.jobRole || w.workerType) && (
                                                            <span className="truncate text-[10px] text-muted-foreground">
                                                                {[w.jobRole, w.workerType].filter(Boolean).join(' · ')}
                                                            </span>
                                                        )}
                                                    </span>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <Label htmlFor="notes">Notes <span className="font-normal text-muted-foreground">(optional)</span></Label>
                        {onOpenAgenda && (
                            <div className="flex items-center gap-1">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-muted-foreground">
                                            <MoreVertical className="h-3.5 w-3.5" /> More tools
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onSelect={onOpenAgenda}>
                                            <UsersIcon className="mr-2 h-4 w-4" /> Meeting Agenda
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href="/calendar">
                                                <CalendarIcon className="mr-2 h-4 w-4" /> Plan tasks &amp; events
                                            </Link>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        )}
                    </div>
                    <Textarea id="notes" className={cn('transition-colors', activityType === 'note' && cn(ACTIVITY_TYPE_COLORS.note, 'border-input dark:border-input'))} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Add notes, instructions or other details..." />
                </div>
                {/* Controls row: Billable / Status (scheduling lives in the When band above) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <Label className="text-sm">Mark as billable</Label>
                                <p className="text-xs text-muted-foreground">This can be included on an invoice</p>
                            </div>
                            <Switch checked={isBillable} onCheckedChange={setIsBillable} aria-label="Mark as billable" />
                        </div>
                        {isBillable && (
                            <div className="space-y-2 max-w-[10rem] animate-in fade-in-50">
                                <Label htmlFor="rate" className="text-xs">Hourly Rate ($/hr)</Label>
                                <Input id="rate" type="number" value={billableRate} onChange={(e) => setBillableRate(e.target.value === '' ? '' : Number(e.target.value))} placeholder="100.00" className="h-9" />
                            </div>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm">Status</Label>
                        <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                            <SelectTrigger className="h-10">
                                <span className="flex items-center gap-2">
                                    <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                                    <SelectValue />
                                </span>
                            </SelectTrigger>
                            <SelectContent>
                                {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
            <ContactFormDialog
                isOpen={isContactFormOpen}
                onOpenChange={setIsContactFormOpen}
                contactToEdit={null}
                folders={contactFolders}
                onFoldersChange={setContactFolders}
                onSave={handleContactSave}
                companies={companies}
                onCompaniesChange={setCompanies}
                customIndustries={customIndustries}
                onCustomIndustriesChange={setCustomIndustries}
            />
        </>
    );
}
