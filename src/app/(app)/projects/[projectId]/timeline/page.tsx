
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LoaderCircle, ChevronLeft, ChevronRight, Calendar as CalendarIcon, GripVertical, Plus, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getProjectById, updateProject, getTasksForProject, addTask, updateTask, deleteTask, updateTaskPositions, getProjects as getAllProjects, getTasksForUser } from '@/services/project-service';
import { type Project, type Event as TaskEvent, type ProjectStep, type TaskStatus } from '@/types/calendar';
import { addDays, differenceInDays, format, startOfWeek, eachDayOfInterval, parseISO } from 'date-fns';
import { useDrop, useDrag } from 'react-dnd';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { ProjectManagementHeader } from '@/components/tasks/ProjectManagementHeader';
import { TaskColumn } from '@/components/tasks/TaskColumn';
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog';
import { getContacts, type Contact } from '@/services/contact-service';

const DAY_WIDTH_PX = 40;

const ItemTypes = {
  STEP: 'step',
  TASK: 'task',
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

export default function ProjectTimelineAndTasksPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [project, setProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [steps, setSteps] = useState<Partial<ProjectStep>[]>([]);
  const [tasks, setTasks] = useState<TaskEvent[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewStartDate, setViewStartDate] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  
  const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskEvent | null>(null);
  const [initialTaskData, setInitialTaskData] = useState<Partial<TaskEvent>>({});

  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const isActionItemsView = projectId === 'inbox';

  const loadData = useCallback(async () => {
    if (!user || !projectId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      let projectData: Project | null;
      let tasksData: TaskEvent[];
      let allProjects: Project[] = [];
      
      if (isActionItemsView) {
        projectData = { id: 'inbox', name: 'Action Items Inbox', description: 'A place for all your unscheduled tasks and ideas.', userId: user.uid, createdAt: new Date(0) };
        const allUserTasks = await getTasksForUser(user.uid);
        tasksData = allUserTasks.filter(task => (!task.projectId || task.projectId === 'inbox') && !task.ritualType);
        allProjects = await getAllProjects(user.uid); // Fetch all projects for the dropdown
      } else {
        [projectData, tasksData, allProjects] = await Promise.all([
          getProjectById(projectId),
          getTasksForProject(projectId),
          getAllProjects(user.uid),
        ]);
        tasksData = tasksData.filter(task => !task.ritualType);
      }
      
      if (!projectData) {
        toast({ variant: 'destructive', title: 'Error', description: 'Project not found.' });
        router.push('/projects');
        return;
      }

      setProject(projectData);
      setProjects(allProjects);
      setSteps((projectData.steps || []).map(s => ({ ...s, startTime: s.startTime ? parseISO(s.startTime as unknown as string) : null })));
      setTasks(tasksData);
      
      if (projectData?.startDate) {
        setViewStartDate(startOfWeek(projectData.startDate, { weekStartsOn: 1 }));
      }
      if (projectData?.endDate) {
        setEndDate(projectData.endDate);
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to load project data', description: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, isActionItemsView, user, router, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const { days, totalDays, timeIntervals } = useMemo(() => {
    let start = viewStartDate;
    let end: Date;

    if (endDate && endDate > startDate) {
      end = endDate;
    } else {
      end = addDays(start, 29); // Default to month view
    }

    const days = eachDayOfInterval({ start, end });
    const totalDays = days.length;
    
    const intervals = [];
    for (let i = 0; i < totalDays; i += 7) {
        const weekEnd = Math.min(i + 6, totalDays - 1);
        intervals.push({ label: `Week of ${format(days[i], 'MMM d')}`, colSpan: weekEnd - i + 1 });
    }

    return { days, totalDays, timeIntervals: intervals };
  }, [viewStartDate, endDate]);

  const moveDate = (amount: number) => {
    setViewStartDate(prev => addDays(prev, amount * 30));
  };
  
  const handleSaveSteps = useCallback(async (updatedSteps: Partial<ProjectStep>[]) => {
    if (project && !isActionItemsView) {
        try {
            await updateProject(project.id, { steps: updatedSteps });
        } catch (error) {
            console.error("Failed to save steps:", error);
            toast({ variant: "destructive", title: "Save failed", description: "Could not save the project plan." });
        }
    }
  }, [project, isActionItemsView, toast]);

  const moveStep = useCallback(async (dragIndex: number, hoverIndex: number) => {
    const newSteps = [...steps];
    const [draggedItem] = newSteps.splice(dragIndex, 1);
    newSteps.splice(hoverIndex, 0, draggedItem);
    setSteps(newSteps);
    await handleSaveSteps(newSteps);
  }, [steps, handleSaveSteps]);
  
  // Kanban handlers
  const tasksByStatus = useMemo(() => {
    const sortedTasks = [...tasks].sort((a, b) => a.position - b.position);
    return {
      todo: sortedTasks.filter(t => t.status === 'todo'),
      inProgress: sortedTasks.filter(t => t.status === 'inProgress'),
      done: sortedTasks.filter(t => t.status === 'done'),
    };
  }, [tasks]);

  const onDropTask = useCallback(async (item: TaskEvent | ProjectStep, newStatus: TaskStatus) => {
      if (!user) return;
      
      // Dropping a step from the plan to create a new task
      if ('isCompleted' in item) { // Type guard for ProjectStep
        try {
            const newTaskData: Omit<TaskEvent, 'id'> = {
                title: item.title || 'New Task from Plan',
                description: item.description || '',
                status: newStatus,
                position: tasks.filter(t => t.status === newStatus).length,
                projectId: projectId === 'inbox' ? null : projectId,
                userId: user.uid,
                isTodoItem: false, // Explicitly set as it's from a project plan
            };
            const savedTask = await addTask(newTaskData);
            setTasks(prev => [...prev, savedTask]);
            toast({ title: 'Task Created', description: `New task "${savedTask.title}" was created from your plan.` });
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Failed to create task', description: error.message });
        }
        return;
      }

      // Moving an existing task
      if (item.status === newStatus) return;
      const originalTasks = [...tasks];
      setTasks(prev => prev.map(t => t.id === item.id ? { ...t, status: newStatus } : t));
      try {
          await updateTask(item.id, { status: newStatus });
      } catch (error: any) {
          setTasks(originalTasks);
          toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not move the task.' });
      }
  }, [tasks, projectId, toast, user]);

  const onMoveCard = useCallback(async (dragId: string, hoverId: string) => {
      const dragTask = tasks.find(t => t.id === dragId);
      const hoverTask = tasks.find(t => t.id === hoverId);
      if (!dragTask || !hoverTask || dragTask.status !== hoverTask.status) return;

      const dragIndex = tasks.findIndex(t => t.id === dragId);
      const hoverIndex = tasks.findIndex(t => t.id === hoverId);

      const newTasks = [...tasks];
      const [draggedItem] = newTasks.splice(dragIndex, 1);
      newTasks.splice(hoverIndex, 0, draggedItem);
      
      const tasksInColumn = newTasks.filter(t => t.status === dragTask.status);
      const updates = tasksInColumn.map((task, index) => ({
          id: task.id,
          position: index,
          status: task.status,
      }));
      
      setTasks(newTasks);
      await updateTaskPositions(updates);
  }, [tasks]);
  
  const handleAddTask = (initialData: Partial<TaskEvent> = {}) => {
    setTaskToEdit(null);
    setInitialTaskData(initialData);
    setIsNewTaskDialogOpen(true);
  };
  
  const handleEditTask = (task: TaskEvent) => {
    setTaskToEdit(task);
    setIsNewTaskDialogOpen(true);
  };

  const handleTaskSaved = () => {
    loadData(); // This will re-fetch both tasks and projects
    setIsNewTaskDialogOpen(false);
  };

  const handleDeleteTask = async (taskId: string) => {
    const originalTasks = [...tasks];
    setTasks(prev => prev.filter(t => t.id !== taskId));
    try {
      await deleteTask(taskId);
      toast({ title: 'Task Deleted' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the task.' });
      setTasks(originalTasks);
    }
  };
  
  const handleToggleComplete = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    onDropTask(task, newStatus);
  };


  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin" /></div>;
  }

  if (!project) return null;

  return (
    <>
      <div className="p-4 sm:p-6 space-y-4">
          <header className="text-center">
              <h1 className="text-3xl font-bold font-headline text-primary">
                  Project Timeline & Plan
              </h1>
              <h2 className="text-xl text-muted-foreground border border-black p-2 rounded-md mt-2 inline-block bg-white">
                {project.name}
              </h2>
          </header>
          <ProjectManagementHeader projectId={projectId} />
        
          <div className="border rounded-lg overflow-hidden">
            <div className="flex justify-between items-center p-2 border-b">
                <h3 className="text-lg font-semibold">Timeline</h3>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => moveDate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                    <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"}><CalendarIcon className="mr-2 h-4 w-4" />{viewStartDate ? format(viewStartDate, "PPP") : '...'}</Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <CustomCalendar mode="single" selected={viewStartDate} onSelect={date => { if(date) setViewStartDate(date); setIsDatePickerOpen(false); }} initialFocus />
                        </PopoverContent>
                    </Popover>
                    <Button variant="outline" size="icon" onClick={() => moveDate(1)}><ChevronRight className="h-4 w-4" /></Button>
                     <Button variant="outline" onClick={() => handleAddTask({ status: 'todo' })}>
                        <Plus className="mr-2 h-4 w-4" /> Add a Task
                    </Button>
                </div>
            </div>
            <div className="flex">
                <div className="w-[250px] flex-shrink-0 p-2 border-r border-b font-semibold text-sm">Project Steps</div>
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
            <div className="overflow-auto" style={{ maxHeight: 'calc(50vh - 200px)'}}>
                {steps.length > 0 ? steps.map((step, index) => (
                    <DraggableTaskRow key={step.id || index} index={index} task={step as TaskEvent} moveTask={moveStep}>
                        <div className="w-[250px] flex-shrink-0 p-2 border-r flex items-center gap-2">
                            <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                            <p className="font-semibold text-sm truncate">{step.title}</p>
                        </div>
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
                    </div>
                )}
            </div>
          </div>
          
          {/* Kanban Board Section */}
          <div className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <TaskColumn 
                status="todo" 
                tasks={tasksByStatus.todo}
                onAddTask={() => handleAddTask({ status: 'todo' })}
                onDropTask={onDropTask} 
                onMoveCard={onMoveCard}
                onTaskDelete={handleDeleteTask}
                onToggleComplete={handleToggleComplete}
                onEdit={handleEditTask}
                onMakeProject={() => {}}
                onArchive={() => {}}
                selectedTaskIds={[]}
                onToggleSelect={() => {}}
                onToggleSelectAll={() => {}} 
              />
              <TaskColumn 
                status="inProgress" 
                tasks={tasksByStatus.inProgress} 
                onDropTask={onDropTask} 
                onMoveCard={onMoveCard}
                onTaskDelete={handleDeleteTask}
                onToggleComplete={handleToggleComplete}
                onEdit={handleEditTask}
                 onMakeProject={() => {}}
                onArchive={() => {}}
                selectedTaskIds={[]}
                onToggleSelect={() => {}}
                onToggleSelectAll={() => {}}
              />
              <TaskColumn 
                status="done" 
                tasks={tasksByStatus.done}
                onDropTask={onDropTask} 
                onMoveCard={onMoveCard}
                onTaskDelete={handleDeleteTask}
                onToggleComplete={handleToggleComplete}
                onEdit={handleEditTask}
                 onMakeProject={() => {}}
                onArchive={() => {}}
                selectedTaskIds={[]}
                onToggleSelect={() => {}}
                onToggleSelectAll={() => {}}
              />
            </div>
          </div>

      </div>

      <CreateTaskDialog
        isOpen={isNewTaskDialogOpen}
        onOpenChange={(open) => { setIsNewTaskDialogOpen(open); if (!open) setTaskToEdit(null); }}
        onTaskCreate={handleTaskSaved}
        onTaskUpdate={handleTaskSaved}
        taskToEdit={taskToEdit}
        projects={projects}
        initialData={initialTaskData}
        projectId={projectId}
      />
    </>
  );
}
