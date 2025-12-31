
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LoaderCircle, ChevronLeft, ChevronRight, Calendar as CalendarIcon, GripVertical, Plus, Wrench, ListTodo, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getProjectById, updateProject, getTasksForProject, addTask, updateTask, deleteTask, updateTaskPositions, getProjects as getAllProjects, type Project } from '@/services/project-service';
import { type Event as TaskEvent, type ProjectStep, type TaskStatus } from '@/types/calendar-types';
import { addDays, differenceInDays, format, startOfWeek, eachDayOfInterval, parseISO, endOfDay } from 'date-fns';
import { useDrop, useDrag } from 'react-dnd';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { ProjectManagementHeader } from '@/components/tasks/ProjectManagementHeader';
import { TaskColumn } from '@/components/tasks/TaskColumn';
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog';
import { getContacts, type Contact } from '@/services/contact-service';

export default function ProjectTimelineAndTasksPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [project, setProject] = useState<Project | null>(null);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
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

  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingStepText, setEditingStepText] = useState('');
  const [stepToDelete, setStepToDelete] = useState<Partial<ProjectStep> | null>(null);
  
  // State for the new "Edit Step Details" dialog
  const [isStepDetailDialogOpen, setIsStepDetailDialogOpen] = useState(false);
  const [stepToDetail, setStepToDetail] = useState<Partial<ProjectStep> | null>(null);
  const [stepDetailDescription, setStepDetailDescription] = useState("");


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
      let allProjectsData: Project[] = [];
      
      if (isActionItemsView) {
        projectData = { id: 'inbox', name: 'Action Items Inbox', description: 'A place for all your unscheduled tasks and ideas.', userId: user.uid, createdAt: new Date(0) };
        const allUserTasks = await getTasksForUser(user.uid);
        tasksData = allUserTasks.filter(task => (!task.projectId || task.projectId === 'inbox') && !task.ritualType);
        allProjectsData = await getAllProjects(user.uid); // Fetch all projects for the dropdown
      } else {
        [projectData, tasksData, allProjectsData] = await Promise.all([
          getProjectById(projectId),
          getTasksForProject(projectId),
          getAllProjects(user.uid),
        ]);
        tasksData = tasksData.filter(task => !task.ritualType);
      }
      
      if (!projectData) {
        toast({ variant: 'destructive', title: 'Error', description: 'Project not found.' });
        router.push('/projects/all');
        return;
      }

      setProject(projectData);
      setAllProjects(allProjectsData);
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
      setTasks(originalTasks);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the task.' });
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
                  {project.name}
              </h1>
              <h2 className="text-xl text-muted-foreground border border-black p-2 rounded-md mt-2 inline-block bg-white">
                Task Board
              </h2>
          </header>
          <ProjectManagementHeader projectId={projectId} />
        
          <div className="flex justify-center gap-2 mb-4">
              <Button variant="outline" onClick={() => handleAddTask({ status: 'todo' })}>
                  <Plus className="mr-2 h-4 w-4" /> Add a Task
              </Button>
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
        projects={allProjects}
        initialData={initialTaskData}
        projectId={projectId}
      />
    </>
  );
}
