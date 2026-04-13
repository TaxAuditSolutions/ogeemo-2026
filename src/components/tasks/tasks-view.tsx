
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MoreVertical, Pencil, Trash2, Archive, LoaderCircle, Plus, Briefcase, Calendar as CalendarIcon, ListChecks, ArrowDownUp, Check, ChevronsUpDown, Folder, GitMerge } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getTasksForUser, addProject, updateTask, deleteTask, deleteTodos, updateTodosStatus } from '@/services/project-service';
import { getProjects } from '@/services/project-service';
import { type Event as TaskEvent, type TaskStatus, type Project } from '@/types/calendar-types';
import { archiveTaskAsFile } from '@/core/file-service';
import { getContacts, type Contact } from '@/services/contact-service';
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog';
import { NewTaskDialog } from '@/components/tasks/NewTaskDialog';
import { TaskColumn } from '../tasks/TaskColumn';
import { cn } from '@/lib/utils';
import { ProjectManagementHeader } from '../tasks/ProjectManagementHeader';


export function ToDoListView() {
  const [tasks, setTasks] = useState<TaskEvent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [taskToEdit, setTaskToEdit] = useState<TaskEvent | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<TaskEvent | null>(null);
  const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false);
  const [initialDialogData, setInitialDialogData] = useState({});
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [taskToConvert, setTaskToConvert] = useState<TaskEvent | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>('all');
  const [isProjectPopoverOpen, setIsProjectPopoverOpen] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);

  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [userTasks, userProjects, userContacts] = await Promise.all([
        getTasksForUser(user.uid),
        getProjects(user.uid),
        getContacts(user.uid),
      ]);
      setTasks(userTasks.filter(task => !task.ritualType));
      setProjects(userProjects);
      setContacts(userContacts);
    } catch (error) {
      console.error("Failed to load data:", error);
      toast({
        variant: 'destructive',
        title: 'Failed to load items',
        description: 'Could not retrieve your tasks and projects.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const filteredTasks = useMemo(() => {
    if (selectedProjectId === 'all') return tasks;
    if (selectedProjectId === 'unassigned') return tasks.filter(t => !t.projectId || t.projectId === 'inbox');
    return tasks.filter(t => t.projectId === selectedProjectId);
  }, [tasks, selectedProjectId]);

  const tasksByStatus = useMemo(() => {
    const sortedTasks = [...filteredTasks].sort((a, b) => a.position - b.position);
    return {
      todo: sortedTasks.filter(t => t.status === 'todo'),
      inProgress: sortedTasks.filter(t => t.status === 'inProgress'),
      done: sortedTasks.filter(t => t.status === 'done'),
    };
  }, [filteredTasks]);

  const onDropTask = useCallback(async (item: TaskEvent, newStatus: TaskStatus) => {
    if (item.status === newStatus) return;
    const originalTasks = [...tasks];
    setTasks(prev => prev.map(t => t.id === item.id ? { ...t, status: newStatus } : t));
    try {
        await updateTask(item.id, { status: newStatus });
    } catch (error) {
        setTasks(originalTasks);
        toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not move the task.' });
    }
  }, [tasks, toast]);

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
    setInitialDialogData(initialData);
    setIsNewTaskDialogOpen(true);
  };

  const handleTaskSaved = () => {
    loadData();
    setIsNewTaskDialogOpen(false);
  };
  
  const handleEditTask = (task: TaskEvent) => {
    setTaskToEdit(task);
    setIsNewTaskDialogOpen(true);
  };

  const handleDeleteTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) setTaskToDelete(task);
  };
  
  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      await deleteTask(taskToDelete.id);
      loadData();
      toast({ title: 'Task Deleted' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the task.' });
    } finally {
      setTaskToDelete(null);
    }
  };

  const handleMakeProject = (task: TaskEvent) => {
    setInitialDialogData({ name: task.title, description: task.description || '' });
    setTaskToConvert(task);
    setIsNewProjectDialogOpen(true);
  };

  const handleProjectCreated = async (projectData: Omit<Project, 'id' | 'createdAt' | 'userId'>, tasks: Omit<TaskEvent, 'id' | 'userId' | 'projectId'>[]) => {
    if (!user) return;
    try {
        const newProject = await addProject({ ...projectData, status: 'planning', userId: user.uid, createdAt: new Date() });
        if (taskToConvert) {
          await deleteTask(taskToConvert.id);
        }
        toast({ title: "Project Created", description: `"${newProject.name}" has been successfully created.` });
        loadData(); // Refresh both projects and todos
    } catch (error: any) {
        toast({ variant: "destructive", title: "Failed to create project", description: error.message });
    } finally {
        setIsNewProjectDialogOpen(false);
        setTaskToConvert(null);
    }
  };
  
  const handleArchive = async (task: TaskEvent) => {
    if (!user) return;
    try {
      await archiveTaskAsFile(user.uid, task);
      await deleteTask(task.id);
      loadData();
      toast({ title: 'Archived', description: 'Task saved to File Manager.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Archive Failed', description: error.message });
    }
  };

  const handleToggleSelect = (taskId: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    setSelectedTaskIds(prev =>
        prev.includes(taskId)
            ? prev.filter(id => id !== taskId)
            : [...prev, taskId]
    );
  };
  
  const handleToggleSelectAll = (status: TaskStatus) => {
    const columnTasks = tasksByStatus[status];
    const columnTaskIds = columnTasks.map(t => t.id);
    const selectedInColumn = selectedTaskIds.filter(id => columnTaskIds.includes(id));

    if (selectedInColumn.length === columnTasks.length) {
      setSelectedTaskIds(prev => prev.filter(id => !columnTaskIds.includes(id)));
    } else {
      setSelectedTaskIds(prev => [...new Set([...prev, ...columnTaskIds])]);
    }
  };


  const handleDeleteSelected = async () => {
    if (selectedTaskIds.length > 0) {
      setIsBulkDeleteAlertOpen(true);
    }
  };
  
  const handleConfirmBulkDelete = async () => {
    try {
      await deleteTodos(selectedTaskIds);
      toast({ title: `${selectedTaskIds.length} tasks deleted.` });
      setSelectedTaskIds([]);
      loadData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Bulk delete failed.', description: error.message });
    } finally {
      setIsBulkDeleteAlertOpen(false);
    }
  };

  const handleToggleComplete = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    onDropTask(task, newStatus);
  };
  
  const projectOptions = [{ id: 'all', name: 'All Tasks' }, { id: 'unassigned', name: 'To-Do List / Unassigned' }, ...projects];

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4">
        <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="p-4 sm:p-6 flex flex-col h-full items-center">
        <header className="text-center mb-6">
          <h1 className="text-3xl font-bold font-headline text-primary">To-Do List</h1>
          <p className="text-muted-foreground">Your central place for all tasks. Drag and drop to change status.</p>
           <div className="mt-4">
                <ProjectManagementHeader />
            </div>
        </header>

        <div className="w-full max-w-7xl flex-1 space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
                <Popover open={isProjectPopoverOpen} onOpenChange={setIsProjectPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="w-64 justify-between">
                            {projectOptions.find(p => p.id === selectedProjectId)?.name || "Select a project..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command><CommandInput placeholder="Search projects..." /><CommandList><CommandEmpty>No project found.</CommandEmpty><CommandGroup>{projectOptions.map(p => (<CommandItem key={p.id} value={p.name} onSelect={() => { setSelectedProjectId(p.id); setIsProjectPopoverOpen(false); }}> <Check className={cn("mr-2 h-4 w-4", selectedProjectId === p.id ? "opacity-100" : "opacity-0")}/>{p.name}</CommandItem>))}</CommandGroup></CommandList></Command>
                    </PopoverContent>
                </Popover>
                 {selectedTaskIds.length > 0 && (
                    <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
                        <Trash2 className="mr-2 h-4 w-4"/> Delete ({selectedTaskIds.length})
                    </Button>
                )}
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => handleAddTask({isTodoItem: true, projectId: selectedProjectId === 'all' || selectedProjectId === 'unassigned' ? null : selectedProjectId})}>
                    <Plus className="mr-2 h-4 w-4" /> Add Task
                </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <TaskColumn 
              status="todo" 
              tasks={tasksByStatus.todo}
              onAddTask={() => handleAddTask({ status: 'todo' })}
              onDropTask={onDropTask} 
              onMoveCard={onMoveCard}
              onTaskDelete={handleDeleteTask}
              onToggleComplete={handleToggleComplete}
              onEdit={handleEditTask}
              onArchive={handleArchive}
              selectedTaskIds={selectedTaskIds}
              onToggleSelect={handleToggleSelect}
              onToggleSelectAll={handleToggleSelectAll}
              onMakeProject={handleMakeProject}
            />
             <TaskColumn 
              status="inProgress" 
              tasks={tasksByStatus.inProgress}
              onDropTask={onDropTask} 
              onMoveCard={onMoveCard}
              onTaskDelete={handleDeleteTask}
              onToggleComplete={handleToggleComplete}
              onEdit={handleEditTask}
              onArchive={handleArchive}
              selectedTaskIds={selectedTaskIds}
              onToggleSelect={handleToggleSelect}
              onToggleSelectAll={handleToggleSelectAll}
              onMakeProject={handleMakeProject}
            />
             <TaskColumn 
              status="done" 
              tasks={tasksByStatus.done}
              onDropTask={onDropTask} 
              onMoveCard={onMoveCard}
              onTaskDelete={handleDeleteTask}
              onToggleComplete={handleToggleComplete}
              onEdit={handleEditTask}
              onArchive={handleArchive}
              selectedTaskIds={selectedTaskIds}
              onToggleSelect={handleToggleSelect}
              onToggleSelectAll={handleToggleSelectAll}
              onMakeProject={handleMakeProject}
            />
          </div>
        </div>
      </div>
      <CreateTaskDialog
        isOpen={isNewTaskDialogOpen}
        onOpenChange={(open) => {
            setIsNewTaskDialogOpen(open);
            if (!open) {
                setTaskToEdit(null);
            }
        }}
        onTaskCreate={handleTaskSaved}
        onTaskUpdate={handleTaskSaved}
        taskToEdit={taskToEdit}
        projects={projects}
        initialData={initialDialogData}
      />
      
      <NewTaskDialog
        isOpen={isNewProjectDialogOpen}
        onOpenChange={setIsNewProjectDialogOpen}
        onProjectCreate={handleProjectCreated}
        contacts={contacts}
        onContactsChange={setContacts}
        projectToEdit={null}
        initialData={initialDialogData}
      />
      
      <AlertDialog open={!!taskToDelete} onOpenChange={() => setTaskToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete the task "{taskToDelete?.title}".</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBulkDeleteAlertOpen} onOpenChange={setIsBulkDeleteAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete {selectedTaskIds.length} task(s). This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmBulkDelete} className="bg-destructive hover:bg-destructive/90">
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
