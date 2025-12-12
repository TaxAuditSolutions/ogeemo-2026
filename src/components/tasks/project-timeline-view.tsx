
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LoaderCircle, ChevronLeft, ChevronRight, Calendar as CalendarIcon, GripVertical, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getProjectById, updateProject, getTasksForProject } from '@/services/project-service';
import { type Project, type Event as TaskEvent, type ProjectStep } from '@/types/calendar';
import { addDays, differenceInDays, format, startOfWeek, eachDayOfInterval, parseISO } from 'date-fns';
import { useDrop, useDrag } from 'react-dnd';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const DAY_WIDTH_PX = 40;

const ItemTypes = {
  STEP: 'step',
};

const DraggableTaskRow = ({ index, task, moveTask, children }: { index: number, task: TaskEvent, moveTask: (dragIndex: number, hoverIndex: number) => void, children: React.ReactNode }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [{ isDragging }, drag] = useDrag({
        type: ItemTypes.STEP,
        item: () => ({ id: task.id, index }),
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });
    
    const [, drop] = useDrop({
        accept: ItemTypes.STEP,
        hover(item: { id: string; index: number }, monitor) {
            if (!ref.current || item.id === task.id) return;
            moveTask(item.index, index);
            item.index = index;
        }
    });

    drag(drop(ref));

    return (
        <div ref={ref} className={cn("flex h-10 border-b", isDragging && 'opacity-50')}>
            {children}
        </div>
    );
};

const StepBar = ({ step, startDate, totalDays }: { step: Partial<ProjectStep>, startDate: Date, totalDays: number }) => {
    if (!step.startTime || !step.durationMinutes) return null;

    const leftOffsetDays = differenceInDays(step.startTime, startDate);
    const durationDays = Math.ceil(step.durationMinutes / (60 * 8)); // Assuming 8-hour work days

    if (leftOffsetDays + durationDays <= 0 || leftOffsetDays >= totalDays) return null;

    const left = Math.max(leftOffsetDays, 0);
    const width = Math.min(durationDays, totalDays - left);

    const style = {
        left: `${left * DAY_WIDTH_PX}px`,
        width: `${width * DAY_WIDTH_PX}px`,
    };

    return (
        <div style={style} className="absolute h-8 top-1/2 -translate-y-1/2 flex items-center bg-primary/80 rounded-lg px-2 text-white text-xs z-10">
            <p className="truncate">{step.title}</p>
        </div>
    );
};

export function ProjectTimelineView({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [steps, setSteps] = useState<Partial<ProjectStep>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewStartDate, setViewStartDate] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [zoomLevel, setZoomLevel] = useState<'month' | 'quarter'>('month');

  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const loadData = useCallback(async () => {
    if (!user || !projectId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const projectData = await getProjectById(projectId);
      setProject(projectData);
      const projectSteps = (projectData?.steps || []).map(s => ({
        ...s,
        startTime: s.startTime ? parseISO(s.startTime as unknown as string) : null,
      }));
      setSteps(projectSteps);
      if (projectData?.startDate) {
        setViewStartDate(startOfWeek(projectData.startDate, { weekStartsOn: 1 }));
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to load project data', description: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, user, toast]);

  useEffect(() => {
    if (projectId && projectId !== 'placeholder') {
      loadData();
    } else {
      setIsLoading(false);
    }
  }, [projectId, loadData]);

  const { days, totalDays, timeIntervals } = useMemo(() => {
    let start = viewStartDate;
    let end: Date;
    if (zoomLevel === 'quarter') {
      end = addDays(start, 89);
    } else {
      end = addDays(start, 29);
    }
    const days = eachDayOfInterval({ start, end });
    const totalDays = days.length;
    
    const intervals = [];
    if (zoomLevel === 'quarter') {
        let currentMonthLabel = '';
        let currentColSpan = 0;
        for (const day of days) {
            const month = format(day, 'MMMM yyyy');
            if (month !== currentMonthLabel) {
                if (currentMonthLabel) intervals.push({ label: currentMonthLabel, colSpan: currentColSpan });
                currentMonthLabel = month;
                currentColSpan = 1;
            } else {
                currentColSpan++;
            }
        }
        if (currentMonthLabel) intervals.push({ label: currentMonthLabel, colSpan: currentColSpan });
    } else { // month
        for (let i = 0; i < totalDays; i += 7) {
            const weekEnd = Math.min(i + 6, totalDays - 1);
            intervals.push({ label: `Week of ${format(days[i], 'MMM d')}`, colSpan: weekEnd - i + 1 });
        }
    }

    return { days, totalDays, timeIntervals: intervals };
  }, [viewStartDate, zoomLevel]);

  const moveDate = (amount: number) => {
    const daysToMove = zoomLevel === 'month' ? 30 : 90;
    setViewStartDate(prev => addDays(prev, amount * daysToMove));
  };
  
  const moveStep = useCallback(async (dragIndex: number, hoverIndex: number) => {
    const newSteps = [...steps];
    const [draggedItem] = newSteps.splice(dragIndex, 1);
    newSteps.splice(hoverIndex, 0, draggedItem);
    setSteps(newSteps);
    
    // Debounced save
    try {
        if (project) {
            await updateProject(project.id, { steps: newSteps });
        }
    } catch (error) {
        console.error("Failed to save reordered steps:", error);
        toast({ variant: 'destructive', title: "Save failed", description: "Could not save the new step order." });
        setSteps(steps); // Revert on failure
    }
  }, [steps, project, toast]);

  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin" /></div>;
  }

  if (!projectId || projectId === 'placeholder') {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <p>Please select a project to view its timeline.</p>
        <Button asChild variant="link"><Link href="/projects">Go to Project Hub</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
        <header className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Timeline: {project?.name}</h2>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => moveDate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button variant={"outline"}><CalendarIcon className="mr-2 h-4 w-4" />{format(viewStartDate, "PPP")}</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={viewStartDate} onSelect={date => date && setViewStartDate(date)} initialFocus /></PopoverContent>
                </Popover>
                <Button variant="outline" size="icon" onClick={() => moveDate(1)}><ChevronRight className="h-4 w-4" /></Button>
                <Select value={zoomLevel} onValueChange={(val) => setZoomLevel(val as 'month' | 'quarter')}>
                    <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="month">Month View</SelectItem>
                        <SelectItem value="quarter">Quarter View</SelectItem>
                    </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => router.push(`/projects/organizer`)}>
                    <Plus className="mr-2 h-4 w-4" /> Add/Edit Steps
                </Button>
            </div>
        </header>
      
      <div className="border rounded-lg overflow-hidden">
        <div className="flex">
            {/* Task List Column Header */}
            <div className="w-[250px] flex-shrink-0 p-2 border-r border-b font-semibold text-sm">Project Steps</div>
            {/* Timeline Header */}
            <div className="flex-1">
                <div className="flex">
                {timeIntervals.map((interval, i) => (
                    <div key={i} className="text-center text-sm font-semibold border-b p-1 border-r" style={{width: `${interval.colSpan * DAY_WIDTH_PX}px`}}>
                        {interval.label}
                    </div>
                ))}
                </div>
                <div className="flex">
                    {days.map((day, i) => (
                        <div key={i} className="text-center text-xs text-muted-foreground border-r border-b" style={{width: `${DAY_WIDTH_PX}px`}}>
                            {format(day, 'd')}
                        </div>
                    ))}
                </div>
            </div>
        </div>
        
        <div className="overflow-auto" style={{ height: 'calc(100vh - 300px)'}}>
            {steps.length > 0 ? steps.map((step, index) => (
                <DraggableTaskRow key={step.id} index={index} task={step as TaskEvent} moveTask={moveStep}>
                    {/* Task Title Cell */}
                    <div className="w-[250px] flex-shrink-0 p-2 border-r flex items-center gap-2">
                        <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                        <p className="font-semibold text-sm truncate">{step.title}</p>
                    </div>
                    {/* Timeline Cell */}
                    <div className="flex-1 relative h-10 border-b">
                         <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${totalDays}, 1fr)` }}>
                            {days.map((day, i) => <div key={i} className="h-full border-r" />)}
                        </div>
                        <StepBar step={step} startDate={viewStartDate} totalDays={totalDays} />
                    </div>
                </DraggableTaskRow>
            )) : (
                <div className="text-center p-8 text-muted-foreground">
                    <p>No steps defined for this project.</p>
                    <Button variant="link" asChild><Link href={`/projects/organizer`}>Go to Organizer to add steps.</Link></Button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
