'use client';

import * as React from 'react';
import { useCallback } from 'react';
import {
  format,
  addDays,
  startOfDay,
  set,
  isWithinInterval,
  addMinutes,
  differenceInMinutes,
  isSameDay,
  startOfWeek,
  eachDayOfInterval,
  parseISO,
  endOfDay,
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  Calendar as CalendarIcon,
  X,
  Info,
  BookOpen,
  BellRing,
  BrainCircuit,
  ChevronDown,
  ArrowRight,
  ListTodo,
  PlayCircle,
  Briefcase,
  Lightbulb,
} from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { HelpTip } from '@/components/ui/help-tip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverClose,
} from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import {
  addTask,
  getTasksForUser,
  getProjectById,
  updateTask,
  deleteTask,
} from '@/services/project-service';
import type { Project } from '@/services/project-service';
import { type Event, type TaskStatus } from '@/types/calendar-types';
import { Label } from '../ui/label';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CalendarSkeleton } from './calendar-skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { CalendarEvent, ItemTypes } from './CalendarEvent';
import { QuickEntryInput } from './quick-entry-input';
import { buildQuickEntry, droppedTimes } from '@/lib/calendar-quick-entry';
import { ActivityFormDialog } from './activity-form-dialog';
import { useDrop } from 'react-dnd';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const CALENDAR_DAY_COUNT_KEY = 'calendarDayCount';
const CALENDAR_START_HOUR_KEY = 'calendarStartHour';
const CALENDAR_END_HOUR_KEY = 'calendarEndHour';
const CALENDAR_SLOTS_CONFIG_KEY = 'calendarSlotsConfig';

const MAX_DAY_COUNT = 31;
const dayOptions = Array.from({ length: MAX_DAY_COUNT }, (_, i) => i + 1);

const isAllDayEvent = (event: Event): boolean => {
  if (!event.start || !event.end) return false;
  return differenceInMinutes(new Date(event.end), new Date(event.start)) >= 24 * 60 - 1;
};

/** True when a click landed on an event or the entry box, which handle their own clicks. */
const clickedOnItem = (target: EventTarget | null): boolean =>
    target instanceof HTMLElement && Boolean(target.closest('[data-calendar-event],[data-quick-entry]'));

interface QuickEntryHandlers {
    /** Saves a one-line entry for the given time span. Resolves true when saved. */
    onQuickAdd: (title: string, start: Date, end: Date) => Promise<boolean>;
    /** Opens the Activity Manager for the span, saving typed text first. */
    onQuickExpand: (title: string, start: Date, end: Date, isAllDay: boolean) => Promise<void>;
}

const AllDayDropZone = ({ date, onDrop, children, onQuickAdd, onQuickExpand }: { date: Date, onDrop: (item: Event, date: Date) => void, children: React.ReactNode } & QuickEntryHandlers) => {
    const [isEntering, setIsEntering] = React.useState(false);
    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: ItemTypes.EVENT,
        drop: (item: Event) => onDrop(item, date),
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    }), [date, onDrop]);

    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    return (
        <div 
            ref={(node) => { drop(node); }} 
            onClick={(e) => { if (!clickedOnItem(e.target)) setIsEntering(true); }}
            title={isEntering ? undefined : 'Click to add an all-day note'}
            className={cn("relative h-auto p-1 border-t mt-2 space-y-1 min-h-[3.5rem] cursor-text hover:bg-accent transition-colors group", isOver && canDrop && "bg-primary/20 ring-1 ring-primary")}
        >
            <div className="relative z-10 flex flex-col gap-1">
                {children}
                {isEntering && (
                    <QuickEntryInput
                        placeholder="All-day note, press Enter"
                        onSave={(title) => onQuickAdd(title, dayStart, dayEnd)}
                        onExpand={(title) => onQuickExpand(title, dayStart, dayEnd, true)}
                        onClose={() => setIsEntering(false)}
                    />
                )}
            </div>
        </div>
    );
};

interface TimeSlotProps extends QuickEntryHandlers {
  date: Date;
  hour: number;
  slot: number;
  slotsPerHour: number;
  allEvents: Event[];
  onDrop: (item: Event, date: Date, hour: number, slot: number) => void;
  onEdit: (event: Event) => void;
  onDelete: (event: Event) => void;
  onToggleComplete: (event: Event) => void;
}

const TimeSlot = ({ date, hour, slot, slotsPerHour, allEvents, onDrop, onEdit, onDelete, onToggleComplete, onQuickAdd, onQuickExpand }: TimeSlotProps) => {
  const [isEntering, setIsEntering] = React.useState(false);
  const slotDuration = 60 / slotsPerHour;
  const slotStartTime = set(date, { hours: hour, minutes: slot * slotDuration, seconds: 0, milliseconds: 0 });
  const slotEndTime = addMinutes(slotStartTime, slotDuration - 1);
  
  const slotEvents = allEvents.filter(event => 
      event.start && event.isScheduled && !isAllDayEvent(event) && isWithinInterval(new Date(event.start), { start: slotStartTime, end: slotEndTime })
  );

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
      accept: ItemTypes.EVENT,
      drop: (item: Event) => onDrop(item, date, hour, slot),
      collect: (monitor) => ({
          isOver: monitor.isOver(),
          canDrop: monitor.canDrop(),
      }),
  }), [date, hour, slot, slotsPerHour, onDrop]);
  
  // A quick entry fills the slot it is typed in (5 to 60 minutes, whatever the slot is set to).
  const quickEnd = addMinutes(slotStartTime, slotDuration);

  return (
    <div
      ref={(node) => { drop(node); }}
      onClick={(e) => { if (!clickedOnItem(e.target)) setIsEntering(true); }}
      title={isEntering ? undefined : `Click to add a note at ${format(slotStartTime, 'h:mm a')}`}
      className={cn(
          "relative h-full flex items-start p-1 gap-1 group cursor-text hover:bg-accent/40 transition-colors",
          isOver && canDrop && "bg-primary/20",
          slot < slotsPerHour - 1 && "border-b border-b-gray-200"
      )}
    >
      <div className="flex-1 flex flex-col gap-1 w-full h-full">
        {slotEvents.map(event => (
          <CalendarEvent
            key={event.id}
            event={event}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleComplete={onToggleComplete}
          />
        ))}
        {isEntering && (
          <QuickEntryInput
            onSave={(title) => onQuickAdd(title, slotStartTime, quickEnd)}
            onExpand={(title) => onQuickExpand(title, slotStartTime, quickEnd, false)}
            onClose={() => setIsEntering(false)}
          />
        )}
      </div>
    </div>
  );
};

export function CalendarView() {
  const [isClient, setIsClient] = React.useState(false);
  const [currentDate, setCurrentDate] = React.useState<Date>(new Date());
  const [dayCount, setDayCount] = React.useState<number>(1);
  const [allEvents, setAllEvents] = React.useState<Event[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [startHour, setStartHour] = React.useState(0);
  const [endHour, setEndHour] = React.useState(23);

  const [filteredProject, setFilteredProject] = React.useState<Project | null>(null);
  const [eventToDelete, setEventToDelete] = React.useState<Event | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [slotsConfig, setSlotsConfig] = React.useState<Record<number, number>>({});

  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // `silent` refreshes the items in place (after a drag or a quick entry) without swapping the
  // whole calendar for the loading skeleton, which would flash and close the entry box.
  const loadEvents = React.useCallback(async (silent: boolean = false) => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    if (!silent) setIsLoading(true);
    try {
      const fetchedTasks = await getTasksForUser(user.uid);
      setAllEvents(fetchedTasks);

      const projectId = searchParams ? searchParams.get('projectId') : null;
      if (projectId) {
        const project = await getProjectById(projectId);
        setFilteredProject(project);
      } else {
        setFilteredProject(null);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to load events',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast, searchParams]);

  React.useEffect(() => {
    loadEvents(false);
  }, [loadEvents]);

  React.useEffect(() => {
    if (!isClient) return;
    try {
      const savedDayCount = localStorage.getItem(CALENDAR_DAY_COUNT_KEY);
      if (savedDayCount) {
        const parsedDayCount = parseInt(savedDayCount, 10);
        if (Number.isFinite(parsedDayCount)) {
          setDayCount(Math.min(Math.max(parsedDayCount, 1), MAX_DAY_COUNT));
        }
      }

      const savedStartHour = localStorage.getItem(CALENDAR_START_HOUR_KEY);
      if (savedStartHour) setStartHour(parseInt(savedStartHour, 10));

      const savedEndHour = localStorage.getItem(CALENDAR_END_HOUR_KEY);
      if (savedEndHour) setEndHour(parseInt(savedEndHour, 10));

      const savedSlotsConfig = localStorage.getItem(CALENDAR_SLOTS_CONFIG_KEY);
      if (savedSlotsConfig) setSlotsConfig(JSON.parse(savedSlotsConfig));

    } catch (error) {
      console.error('Failed to load calendar preferences:', error);
    }
  }, [isClient]);

  const handleDayCountChange = (value: string) => {
    const newDayCount = Math.min(Math.max(Number(value) || 1, 1), MAX_DAY_COUNT);
    setDayCount(newDayCount);
    try {
      localStorage.setItem(CALENDAR_DAY_COUNT_KEY, String(newDayCount));
    } catch (error) {
      console.error('Failed to save calendar preferences:', error);
    }
  };

  const handleStartHourChange = (value: string) => {
    const newStartHour = Number(value);
    setStartHour(newStartHour);
    localStorage.setItem(CALENDAR_START_HOUR_KEY, value);
  };

  const handleEndHourChange = (value: string) => {
    const newEndHour = Number(value);
    setEndHour(newEndHour);
    localStorage.setItem(CALENDAR_END_HOUR_KEY, value);
  };

  const handleSlotsChange = (hour: number, slots: number) => {
    const newConfig = { ...slotsConfig, [hour]: slots };
    setSlotsConfig(newConfig);
    try {
      localStorage.setItem(CALENDAR_SLOTS_CONFIG_KEY, JSON.stringify(newConfig));
    } catch (error) {
      console.error('Failed to save slot configuration:', error);
    }
  };

  const visibleDates = React.useMemo(() => {
    const start = startOfDay(currentDate);
    return Array.from({ length: dayCount }, (_, i) => addDays(start, i));
  }, [currentDate, dayCount]);

  const handlePrev = () => setCurrentDate((prev) => addDays(prev, -dayCount));
  const handleNext = () => setCurrentDate((prev) => addDays(prev, dayCount));
  const handleToday = () => setCurrentDate(new Date());

  const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    value: String(i),
    label: format(set(new Date(), { hours: i }), 'h a'),
  }));
  
  const handleEditEvent = (event: Event) => {
    router.push(`/event-manager?eventId=${event.id}`);
  };

  const handleConfirmDelete = async () => {
    if (!eventToDelete) return;
    try {
      await deleteTask(eventToDelete.id);
      toast({ title: 'Event Deleted' });
      loadEvents(true);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to delete event',
        description: error.message,
      });
    } finally {
      setEventToDelete(null);
    }
  };

  const handleToggleComplete = async (event: Event) => {
    const newStatus = event.status === 'done' ? 'todo' : 'done';
    try {
      await updateTask(event.id, { status: newStatus });
      toast({ title: `Task ${newStatus === 'done' ? 'completed' : 'reopened'}` });
      loadEvents(true);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to update task status' });
    }
  };

  const hoursToDisplay = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  
  const handleDrop = useCallback(async (item: Event, date: Date, hour: number, slot: number) => {
      const slotsPerHour = slotsConfig[hour] || 1;
      const slotDuration = 60 / slotsPerHour;
      const slotStart = set(date, { hours: hour, minutes: slot * slotDuration, seconds: 0, milliseconds: 0 });
      // A timed item keeps its length; an all-day item takes the length of the slot it lands in.
      const { start: newStartTime, end: newEndTime } = droppedTimes(item, slotStart, slotDuration);
      
      try {
          await updateTask(item.id, { start: newStartTime, end: newEndTime, isScheduled: true });
          toast({ title: "Event Rescheduled", description: `"${item.title}" moved to ${format(newStartTime, 'PPP p')}.`});
          await loadEvents(true);
      } catch (error: any) {
          console.error("Failed to update event time:", error);
          toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not save the new time.'});
      }
  }, [slotsConfig, loadEvents, toast]);

  const handleAllDayDrop = useCallback(async (item: Event, date: Date) => {
    if (!item.id) return;
    const newStart = startOfDay(date);
    const newEnd = endOfDay(date);
    try {
        const updatePayload: Partial<Event> = { 
            start: newStart, 
            end: newEnd, 
            isScheduled: true,
            ritualType: (item as any).ritualType,
        };
        await updateTask(item.id, updatePayload);
        toast({ title: "Event Updated", description: `"${item.title}" is now an all-day event for ${format(newStart, 'PPP')}.`});
        await loadEvents(true);
    } catch (error: any) {
        console.error("Failed to update event to all-day:", error);
        toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not make the event all-day.' });
    }
  }, [loadEvents, toast]);

  // Saves a one-line entry as a scheduled to-do and shows it straight away.
  const handleQuickAdd = useCallback(async (title: string, start: Date, end: Date): Promise<boolean> => {
    if (!user) return false;
    const entry = buildQuickEntry({ title, start, end, userId: user.uid });
    if (!entry) return false;
    try {
      const created = await addTask(entry);
      setAllEvents((current) => [...current, created]);
      return true;
    } catch (error: any) {
      console.error('Failed to save quick entry:', error);
      toast({ variant: 'destructive', title: 'Could not save the note', description: error?.message || 'Please try again.' });
      return false;
    }
  }, [user, toast]);

  // Opens the Activity Manager for a slot. Typed text is saved first, so nothing is lost and
  // the Activity Manager opens that saved item with the slot's time intact.
  const handleQuickExpand = useCallback(async (title: string, start: Date, end: Date, isAllDay: boolean) => {
    if (title.trim()) {
      const entry = user ? buildQuickEntry({ title, start, end, userId: user.uid }) : null;
      if (entry) {
        try {
          const created = await addTask(entry);
          router.push(`/event-manager?eventId=${created.id}`);
          return;
        } catch (error: any) {
          toast({ variant: 'destructive', title: 'Could not save the note', description: error?.message || 'Please try again.' });
          return;
        }
      }
    }
    const params = new URLSearchParams({ start: start.toISOString() });
    if (isAllDay) params.set('isAllDay', 'true');
    else params.set('end', end.toISOString());
    router.push(`/event-manager?${params.toString()}`);
  }, [user, router, toast]);
  
  const getEventsForDay = (date: Date) => {
    const dayStart = startOfDay(date);
    const dayEnd = addDays(dayStart, 1);
    return allEvents.filter(event =>
      event.isScheduled &&
      event.start &&
      event.end &&
      isWithinInterval(dayStart, { start: new Date(event.start), end: new Date(event.end) })
    );
  };

  if (isLoading) {
    return <CalendarSkeleton />;
  }

  return (
    <>
      <div className="p-4 sm:p-6 flex flex-col h-full bg-background max-w-6xl mx-auto">
        <header className="print:hidden flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-1">
              <h1 className="text-3xl font-bold font-headline text-primary">
                Calendar
              </h1>
              <HelpTip
                title="Calendar"
                learnHref="/learn/guides/calendar"
                learnLabel="Learn about the calendar"
              >
                Your appointments, reminders, and planning routines in one place.
              </HelpTip>
            </div>
            <p className="text-muted-foreground">
              Your Calendar for your actions and connection to the apps in Ogeemo
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </Button>
        </header>

        <div className="flex flex-col space-y-4 pb-4">
          {/* Row 1: Navigation Hub - Center Justified */}
          <div className="flex items-center justify-center gap-2">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" asChild size="sm">
                            <Link href="/to-do">
                                <ListTodo className="mr-2 h-4 w-4" /> To-Do List
                            </Link>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>View your unassigned tasks</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" asChild size="sm">
                            <Link href="/event-manager">
                                <PlayCircle className="mr-2 h-4 w-4" /> Activity Manager
                            </Link>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Log time and add detail to your activities</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" asChild size="sm">
                            <Link href="/projects/all">
                                <Briefcase className="mr-2 h-4 w-4" /> Project List
                            </Link>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Manage your multi-step projects</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" asChild size="sm">
                            <Link href="/idea-board">
                                <Lightbulb className="mr-2 h-4 w-4" /> Idea Board
                            </Link>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Capture and triage your ideas</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" asChild size="sm">
                            <Link href="/learn/guides/calendar">
                                <BookOpen className="mr-2 h-4 w-4" /> Instructions
                            </Link>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>How to use the Calendar</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
          </div>

          {/* Row 2: Date Controls & Utility Icons */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex-1 flex justify-center items-center gap-2">
              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    className={cn(
                      'w-[280px] justify-center text-center font-normal bg-card text-card-foreground',
                      !currentDate && 'text-muted-foreground'
                    )}
                  >
                    <ChevronLeft
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrev();
                      }}
                      className="h-4 w-4"
                    />
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span className="mx-2">
                      {format(currentDate, 'cccc, LLLL do')}
                    </span>
                    <ChevronRight
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNext();
                      }}
                      className="h-4 w-4"
                    />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CustomCalendar
                    mode="single"
                    selected={currentDate}
                    onSelect={(date) => {
                      if (date) {
                        setCurrentDate(date);
                        setIsDatePickerOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Button onClick={handleToday} className="bg-card text-card-foreground">
                Today
              </Button>
              <Select value={String(dayCount)} onValueChange={handleDayCountChange}>
                <SelectTrigger className="w-[110px] bg-card text-card-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dayOptions.map((day) => (
                    <SelectItem key={day} value={String(day)}>
                      {day} Day{day > 1 ? 's' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end items-center gap-2">
              <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
                Add +
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button asChild variant="ghost" size="icon">
                      <Link href="/settings/rituals">
                        <BrainCircuit className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Planning Rituals</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button asChild variant="ghost" size="icon">
                      <Link href="/calendar/reminders">
                        <BellRing className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Create a Reminder</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button asChild variant="ghost" size="icon">
                      <Link href="/learn/guides/gtd">
                        <BookOpen className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>The Ogeemo Method (TOM)</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button asChild variant="ghost" size="icon">
                      <Link href="/learn/guides/calendar">
                        <Info className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>How to use the calendar</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Settings">
                    <Settings className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div>
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium leading-none">
                          Display Settings
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Set the visible hours for your calendar day.
                        </p>
                      </div>
                      <div className="grid gap-2">
                        <div className="grid grid-cols-3 items-center gap-4">
                          <Label htmlFor="start-time">Start Time</Label>
                          <Select
                            value={String(startHour)}
                            onValueChange={handleStartHourChange}
                          >
                            <SelectTrigger
                              id="start-time"
                              className="col-span-2 h-8"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {hourOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-3 items-center gap-4">
                          <Label htmlFor="end-time">End Time</Label>
                          <Select
                            value={String(endHour)}
                            onValueChange={handleEndHourChange}
                          >
                            <SelectTrigger id="end-time" className="col-span-2 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {hourOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end pt-4">
                      <PopoverClose asChild>
                        <Button>Save</Button>
                      </PopoverClose>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <div className="flex flex-1 min-h-0 border-black border rounded-lg overflow-hidden flex-col bg-white">
          <div className="grid grid-cols-[5rem,1fr] flex-shrink-0">
            <div className="border-r-black border-r border-b border-b-black h-auto flex flex-col items-center justify-center p-1 text-center">
                <p className="text-xs font-semibold leading-tight">All Day Events</p>
                <ArrowRight className="h-4 w-4 mt-1" />
            </div>
            <div className="grid" style={{ gridTemplateColumns: `repeat(${dayCount}, minmax(0, 1fr))` }}>
              {visibleDates.map((date, index) => {
                const dayEvents = getEventsForDay(date);
                const allDayEvents = dayEvents.filter(event => isAllDayEvent(event));
                return (
                    <div key={index} className={cn("text-center py-2 border-b border-b-black flex flex-col", index < visibleDates.length - 1 && "border-r border-r-black")}>
                        <p className={cn('font-semibold', dayCount > 14 ? 'text-xs' : 'text-base')}>{format(date, 'EEE d')}</p>
                        <AllDayDropZone date={date} onDrop={handleAllDayDrop} onQuickAdd={handleQuickAdd} onQuickExpand={handleQuickExpand}>
                            {allDayEvents.map(event => (
                                <CalendarEvent
                                    key={event.id}
                                    event={event}
                                    onEdit={handleEditEvent}
                                    onDelete={setEventToDelete}
                                    onToggleComplete={handleToggleComplete}
                                />
                            ))}
                        </AllDayDropZone>
                    </div>
                );
              })}
            </div>
          </div>
          
          <ScrollArea className="flex-1 border-t-0">
            {hoursToDisplay.map((hour, hourIndex) => {
                const slotsPerHour = slotsConfig[hour] || 1;
                return (
                    <div key={hour} className="flex border-b border-black">
                        <div className="w-[5rem] flex-shrink-0 border-r-black border-r flex items-center justify-center p-1">
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-full w-full text-xs text-muted-foreground flex flex-row items-center justify-between px-2">
                                    <span>{format(set(new Date(), { hours: hour }), 'h a')}</span>
                                    <ChevronDown className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {[1, 2, 3, 4, 5, 6, 12].map(slotOption => (
                                    <DropdownMenuItem key={slotOption} onSelect={() => handleSlotsChange(hour, slotOption)}>
                                        {slotOption} slot{slotOption > 1 ? 's' : ''}/hr
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${dayCount}, minmax(0, 1fr))` }}>
                            {visibleDates.map((date, index) => (
                                <div 
                                    key={index} 
                                    className={cn("relative grid border-r-black", index < visibleDates.length - 1 && "border-r")} 
                                    style={{ 
                                        gridTemplateRows: `repeat(${slotsPerHour}, 1fr)`,
                                        minHeight: `${slotsPerHour * 3}rem`,
                                    }}
                                >
                                    {Array.from({ length: slotsPerHour }).map((_, slot) => (
                                        <TimeSlot 
                                          key={slot} 
                                          date={date} 
                                          hour={hour} 
                                          slot={slot} 
                                          slotsPerHour={slotsPerHour} 
                                          allEvents={allEvents}
                                          onDrop={handleDrop}
                                          onEdit={handleEditEvent}
                                          onDelete={setEventToDelete}
                                          onToggleComplete={handleToggleComplete}
                                          onQuickAdd={handleQuickAdd}
                                          onQuickExpand={handleQuickExpand}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                )
            })}
          </ScrollArea>
        </div>
      </div>

      <ActivityFormDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSaved={loadEvents}
      />

      <AlertDialog open={!!eventToDelete} onOpenChange={(open) => { if (!open) setEventToDelete(null); }} >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the event "{eventToDelete?.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
