
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
  Plus,
  ChevronDown,
} from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
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
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import {
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

export function CalendarView() {
  const [isClient, setIsClient] = React.useState(false);
  const [currentDate, setCurrentDate] = React.useState<Date>(new Date());
  const [dayCount, setDayCount] = React.useState<number>(1);
  const [allEvents, setAllEvents] = React.useState<Event[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [startHour, setStartHour] = React.useState(0);
  const [endHour, setEndHour] = React.useState(23);

  const [filteredProject, setFilteredProject] = React.useState<Project | null>(
    null
  );
  const [eventToDelete, setEventToDelete] = React.useState<Event | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);
  const [slotsConfig, setSlotsConfig] = React.useState<Record<number, number>>({});

  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const dayOptions = Array.from({ length: 30 }, (_, i) => i + 1);

  const loadEvents = React.useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
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
    loadEvents();
  }, [loadEvents]);

  React.useEffect(() => {
    if (!isClient) return;
    try {
      const savedDayCount = localStorage.getItem(CALENDAR_DAY_COUNT_KEY);
      if (savedDayCount) setDayCount(parseInt(savedDayCount, 10));

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
    const newDayCount = Number(value);
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
    router.push(`/master-mind?eventId=${event.id}`);
  };

  const handleConfirmDelete = async () => {
    if (!eventToDelete) return;
    try {
      await deleteTask(eventToDelete.id);
      toast({ title: 'Event Deleted' });
      loadEvents();
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
      loadEvents();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to update task status' });
    }
  };

  const hoursToDisplay = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  
  const handleDrop = async (item: Event, date: Date, hour: number, slot: number) => {
      const slotsPerHour = slotsConfig[hour] || 1;
      const slotDuration = 60 / slotsPerHour;
      const newStartTime = set(date, { hours: hour, minutes: slot * slotDuration, seconds: 0, milliseconds: 0 });
      const originalDuration = item.end && item.start ? differenceInMinutes(item.end, item.start) : 30;
      const newEndTime = addMinutes(newStartTime, originalDuration);
      
      try {
          await updateTask(item.id, { start: newStartTime, end: newEndTime });
          toast({ title: "Event Rescheduled", description: `"${item.title}" moved to ${format(newStartTime, 'PPP p')}.`});
          await loadEvents();
      } catch (error: any) {
          console.error("Failed to update event time:", error);
          toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not save the new time.'});
      }
  };
  
  if (!isClient) {
    return <CalendarSkeleton />;
  }
  
  const TimeSlot = ({ date, hour, slot, slotsPerHour }: { date: Date; hour: number; slot: number, slotsPerHour: number }) => {
    const slotDuration = 60 / slotsPerHour;
    const slotStartTime = set(date, { hours: hour, minutes: slot * slotDuration, seconds: 0, milliseconds: 0 });
    const slotEndTime = addMinutes(slotStartTime, slotDuration -1);
    
    const slotEvents = allEvents.filter(event => 
        event.start && isWithinInterval(event.start, { start: slotStartTime, end: slotEndTime })
    );

    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: ItemTypes.EVENT,
        drop: (item: Event) => handleDrop(item, date, hour, slot),
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    }));
    
    const handleSlotClick = () => {
        const calculatedEndTime = addMinutes(slotStartTime, slotDuration);
        const startTimeString = slotStartTime.toISOString();
        const endTimeString = calculatedEndTime.toISOString();
        router.push(`/master-mind?start=${startTimeString}&end=${endTimeString}`);
    };

    return (
      <div
        ref={drop}
        className={cn(
            "relative h-full flex items-start p-1 gap-1 group", 
            isOver && canDrop && "bg-primary/20",
            slot < slotsPerHour - 1 && "border-b border-b-gray-200" // Add bottom border to all but the last slot
        )}
      >
        <Button variant="ghost" size="icon" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity z-20" onClick={handleSlotClick}>
            <Plus className="h-5 w-5"/>
        </Button>
        <div className="flex-1 flex flex-col gap-1 w-full h-full">
          {slotEvents.map(event => (
            <CalendarEvent
              key={event.id}
              event={event}
              onEdit={handleEditEvent}
              onDelete={setEventToDelete}
              onToggleComplete={handleToggleComplete}
            />
          ))}
        </div>
      </div>
    );
  };


  return (
    <>
      <div className="p-4 sm:p-6 flex flex-col h-full bg-background">
        <header className="relative text-center mb-6 print:hidden">
          <h1 className="text-3xl font-bold font-headline text-primary">
            Calendar
          </h1>
          <p className="text-muted-foreground">
            Manage your schedule, events and appointments.
          </p>
          <div className="absolute top-0 right-0">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </header>
        <div className="flex items-center justify-between flex-wrap gap-4 pb-4">
          <div />
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
                <Calendar
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
                    <Link href="/master-mind/gtd-instructions">
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
                    <Link href="/calendar/instructions">
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

        <div className="flex flex-1 min-h-0 border-black border rounded-lg overflow-hidden flex-col bg-white">
          <div className="grid grid-cols-[5rem,1fr] flex-shrink-0">
            <div className="border-r-black border-r border-b border-b-black h-14"></div>
            <div className="grid" style={{ gridTemplateColumns: `repeat(${dayCount}, minmax(0, 1fr))` }}>
              {visibleDates.map((date, index) => (
                <div key={index} className={cn("text-center py-3 border-b border-b-black", index < visibleDates.length - 1 && "border-r border-r-black")}>
                   <p className="font-semibold text-base">{format(date, 'EEE d')}</p>
                </div>
              ))}
            </div>
          </div>
          
          <ScrollArea className="flex-1 border-t-0">
            {hoursToDisplay.map((hour, hourIndex) => {
                const slotsPerHour = slotsConfig[hour] || 1;
                return (
                    <div key={hour} className="flex border-b border-black">
                        {/* Time Gutter Cell */}
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
                        {/* Grid Content for the hour */}
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
                                        <TimeSlot key={slot} date={date} hour={hour} slot={slot} slotsPerHour={slotsPerHour} />
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

      <AlertDialog open={!!eventToDelete} onOpenChange={() => setEventToDelete(null)}>
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
