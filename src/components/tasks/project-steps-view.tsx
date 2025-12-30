
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MoreVertical, Pencil, Trash2, Archive, LoaderCircle, Plus, Briefcase, Calendar as CalendarIcon, ListChecks } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getProjectById, getTasksForProject, addTask, updateTask, updateTodoPositions, deleteTask, addProject } from '@/services/project-service';
import { type Project, type Event as TaskEvent, type TaskStatus } from '@/types/calendar-types';
import { archiveTaskAsFile } from '@/services/file-service';
import { getContacts, type Contact } from '@/services/contact-service';
import { NewTaskDialog } from './NewTaskDialog';
import { TaskColumn } from './TaskColumn';
import { ProjectManagementHeader } from './ProjectManagementHeader';

export default function ProjectStepsView() {
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<TaskEvent[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [taskToEdit, setTaskToEdit] = useState<TaskEvent | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<TaskEvent | null>(null);
  const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false);
  
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [initialDialogData, setInitialDialogData] = useState({});
  const [taskToConvert, setTaskToConvert] = useState<TaskEvent | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const { user } = useAuth();
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    if (!user || !projectId) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
        const [projectData, tasksData, contactsData] = await Promise.all([
            getProjectById(projectId),
            getTasksForProject(projectId),
            getContacts(user.uid),
        ]);
        if (!projectData) {
            toast({ variant: 'destructive', title: 'Error', description: 'Project not found.' });
            router.push('/projects');
            return;
        }
        setProject(projectData);
        setTasks(tasksData);
        setContacts(contactsData);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Failed to load project data', description: error.message });
    } finally {
        setIsLoading(false);
    }
  }, [projectId, user, toast, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const handleTaskSaved = () => {
    loadData();
    setIsNewTaskDialogOpen(false);
  };
  
  const handleMakeProject = (task: TaskEvent) => {
    setTaskToConvert(task);
    setInitialDialogData({ name: task.title, description: task.description || '' });
    setIsNewProjectDialogOpen(true);
  };

  const handleProjectCreated = async (projectData: Omit<Project, 'id' | 'createdAt' | 'userId'>, tasks: Omit<TaskEvent, 'id' | 'userId' | 'projectId'>[]) => {
    if (!user || !taskToConvert) return;
    try {
        const newProject = await addProject({ ...projectData, status: 'planning', userId: user.uid, createdAt: new Date() });
        await deleteTask(taskToConvert.id); // Delete the original task after converting
        toast({ title: "Project Created", description: `"${newProject.name}" has been successfully created from your task.` });
        loadData(); // Refresh data to remove old task and show new project info
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
  
  const handleToggleComplete = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    
    const originalTasks = [...tasks];
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    try {
        await updateTask(taskId, { status: newStatus });
        toast({ title: `Task marked as ${newStatus === 'done' ? 'complete' : 'to-do'}` });
    } catch (error: any) {
        setTasks(originalTasks);
        toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    }
  };


  const tasksByStatus = useMemo(() => ({
    todo: tasks.filter(t => t.status === 'todo').sort((a,b) => a.position - b.position),
    inProgress: tasks.filter(t => t.status === 'inProgress').sort((a,b) => a.position - b.position),
    done: tasks.filter(t => t.status === 'done').sort((a,b) => a.position - b.position),
  }), [tasks]);

  const onDropTask = useCallback(async (item: TaskEvent, newStatus: TaskStatus) => {
    if (item.status === newStatus) return;

    const originalTasks = [...tasks];
    const updatedTasks = tasks.map(t => t.id === item.id ? { ...t, status: newStatus } : t);
    setTasks(updatedTasks);
    
    try {
        await updateTask(item.id, { status: newStatus });
    } catch (error: any) {
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

  const columnTitles: Record<TaskStatus, string> = {
    todo: 'Steps To Do',
    inProgress: 'In Progress',
    done: 'Done',
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4">
        <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>Project not found. It may have been deleted.</p>
        <Button asChild variant="link"><Link href="/projects">Return to Project Hub</Link></Button>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 sm:p-6 flex flex-col h-full items-center">
        <header className="text-center mb-6">
          <h1 className="text-3xl font-bold font-headline text-primary">{project.name}</h1>
          <p className="text-muted-foreground">{project.description || "Manage your project's tasks below."}</p>
        </header>

        <ProjectManagementHeader projectId={projectId} />

        <div className="w-full max-w-7xl flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {(['todo', 'inProgress', 'done'] as TaskStatus[]).map(status => (
            <TaskColumn
              key={status}
              status={status}
              tasks={tasksByStatus[status]}
              onAddTask={() => { setTaskToEdit(null); setInitialDialogData({ projectId, status }); setIsNewTaskDialogOpen(true); }}
              onDropTask={onDropTask}
              onMoveCard={onMoveCard}
              onEdit={(task) => { setTaskToEdit(task); setIsNewTaskDialogOpen(true); }}
              onTaskDelete={(taskId) => {
                const task = tasks.find(t => t.id === taskId);
                if (task) setTaskToDelete(task);
              }}
              onToggleComplete={(taskId) => {
                const task = tasks.find(t => t.id === taskId);
                if (task) onDropTask(task, task.status === 'done' ? 'todo' : 'done');
              }}
              onMakeProject={handleMakeProject}
              onArchive={handleArchive}
              selectedTaskIds={[]}
              onToggleSelect={() => {}}
              onToggleSelectAll={() => {}}
            />
          ))}
        </div>
      </div>
      
      <CreateTaskDialog
        isOpen={isNewTaskDialogOpen}
        onOpenChange={(open) => { setIsNewTaskDialogOpen(open); if (!open) setTaskToEdit(null); }}
        onTaskCreate={handleTaskSaved}
        onTaskUpdate={handleTaskSaved}
        taskToEdit={taskToEdit}
        projectId={projectId || undefined}
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
    </>
  );
}

    