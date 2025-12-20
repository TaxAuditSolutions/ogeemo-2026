
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDrag, useDrop } from 'react-dnd';
import { MoreVertical, Pencil, Trash2, LoaderCircle, Plus, Briefcase, ListTodo, Archive } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getTasksForUser, updateTask, deleteTask as deleteTaskFromDb, updateTaskPositions, deleteTasks, updateTasksStatus } from '@/services/project-service';
import { type Event as TaskEvent, type TaskStatus, type Project } from '@/types/calendar-types';
import { NewTaskDialog } from '@/components/tasks/NewTaskDialog';
import { cn } from '@/lib/utils';
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
import { addProject } from '@/services/project-service';
import { getContacts, type Contact } from '@/services/contact-service';
import { TaskColumn } from '@/components/tasks/TaskColumn';
import { archiveIdeaAsFile, archiveTaskAsFile } from '@/services/file-service';

export function ToDoListView() {
  const [tasks, setTasks] = useState<TaskEvent[]>([]);
  const [taskToEdit, setTaskToEdit] = useState<TaskEvent | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<TaskEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [initialDialogData, setInitialDialogData] = useState({});
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [taskToConvert, setTaskToConvert] = useState<TaskEvent | null>(null);
  
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);


  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const loadTasks = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const userTasks = await getTasksForUser(user.uid);
      setTasks(userTasks.filter(t => !t.projectId || t.projectId === 'inbox'));
      const userContacts = await getContacts(user.uid);
      setContacts(userContacts);
    } catch (error) {
      console.error("Failed to load tasks:", error);
      toast({
        variant: 'destructive',
        title: 'Failed to load items',
        description: 'Could not retrieve your task list.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleEditTask = (task: TaskEvent) => {
    setTaskToEdit(task);
    setIsTaskDialogOpen(true);
  };
  
  const handleAddTask = () => {
    setTaskToEdit(null);
    setIsTaskDialogOpen(true);
  };

  const handleTaskSaved = () => {
    loadTasks();
    setIsTaskDialogOpen(false);
  };

  const handleDeleteTask = async (task: TaskEvent) => {
    setTaskToDelete(task);
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    const originalTasks = [...tasks];
    setTasks(tasks.filter(t => t.id !== taskToDelete.id));
    try {
      await deleteTaskFromDb(taskToDelete.id);
      toast({ title: "Task Deleted" });
    } catch (error) {
      setTasks(originalTasks);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the task.' });
    } finally {
        setTaskToDelete(null);
    }
  };

  const onDropTask = async (item: TaskEvent, newStatus: TaskStatus) => {
      if (item.status === newStatus) return;

      const originalTasks = [...tasks];
      const updatedTasks = tasks.map(t => t.id === item.id ? { ...t, status: newStatus } : t);
      setTasks(updatedTasks);

      try {
          await updateTask(item.id, { status: newStatus });
      } catch (error) {
          setTasks(originalTasks);
          toast({ variant: 'destructive', title: 'Update failed', description: 'Could not move the task.' });
      }
  };

  const handleMakeProject = (task: TaskEvent) => {
    setInitialDialogData({ name: task.title, description: task.description || '' });
    setTaskToConvert(task);
    setIsNewProjectDialogOpen(true);
  };
  
  const handleProjectCreated = async (projectData: Omit<Project, 'id' | 'createdAt' | 'userId'>, tasks: Omit<TaskEvent, 'id' | 'userId' | 'projectId'>[]) => {
    if (!user || !taskToConvert) return;
    try {
        const newProject = await addProject({ ...projectData, status: 'planning', userId: user.uid, createdAt: new Date() });
        await deleteTaskFromDb(taskToConvert.id);
        toast({ title: "Project Created", description: `"${newProject.name}" created and original task removed.` });
        loadTasks(); // Refresh the to-do list
    } catch (error: any) {
        toast({ variant: "destructive", title: "Failed to create project", description: error.message });
    } finally {
        setIsNewProjectDialogOpen(false);
        setTaskToConvert(null);
    }
  };
  
  const onMoveCard = useCallback(async (dragId: string, hoverId: string) => {
      const dragTask = tasks.find(t => t.id === dragId);
      const hoverTask = tasks.find(t => t.id === hoverId);
      if (!dragTask || !hoverTask) return;

      const dragIndex = tasks.findIndex(t => t.id === dragId);
      const hoverIndex = tasks.findIndex(t => t.id === hoverId);

      const newTasks = [...tasks];
      const [draggedItem] = newTasks.splice(dragIndex, 1);
      newTasks.splice(hoverIndex, 0, draggedItem);
      
      const positionUpdates = newTasks.map((task, index) => ({
        id: task.id,
        position: index,
        status: task.status, // Ensure status is part of the update
      }));
      
      setTasks(newTasks); // Optimistic update
      
      await updateTaskPositions(positionUpdates);
  }, [tasks]);

  const onToggleComplete = async (taskId: string) => {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      const newStatus = task.status === 'done' ? 'todo' : 'done';
      onDropTask(task, newStatus);
  };
  
  const handleToggleSelect = (taskId: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    setSelectedTaskIds(prev =>
        prev.includes(taskId)
            ? prev.filter(id => id !== taskId)
            : [...prev, id]
    );
  };

  const handleToggleSelectAll = (status: TaskStatus) => {
    const columnTaskIds = tasks.filter(t => t.status === status).map(t => t.id);
    const allSelected = columnTaskIds.length > 0 && columnTaskIds.every(id => selectedTaskIds.includes(id));
    if (allSelected) {
        setSelectedTaskIds(prev => prev.filter(id => !columnTaskIds.includes(id)));
    } else {
        setSelectedTaskIds(prev => [...new Set([...prev, ...columnTaskIds])]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedTaskIds.length === 0) return;
    setIsBulkDeleteAlertOpen(true);
  };
  
  const handleConfirmBulkDelete = async () => {
    const originalTasks = [...tasks];
    setTasks(prev => prev.filter(t => !selectedTaskIds.includes(t.id)));
    try {
        await deleteTasks(selectedTaskIds);
        toast({ title: `${selectedTaskIds.length} tasks deleted.` });
        setSelectedTaskIds([]);
    } catch(error: any) {
        setTasks(originalTasks);
        toast({ variant: 'destructive', title: 'Bulk delete failed.', description: error.message });
    } finally {
        setIsBulkDeleteAlertOpen(false);
    }
  };
  
  const handleArchiveSelected = async () => {
    if (!user || selectedTaskIds.length === 0) return;
    
    const tasksToArchive = tasks.filter(t => selectedTaskIds.includes(t.id));
    const originalTasks = [...tasks];
    setTasks(prev => prev.filter(t => !selectedTaskIds.includes(t.id)));
    setSelectedTaskIds([]);

    try {
        for (const task of tasksToArchive) {
            await archiveTaskAsFile(user.uid, task);
        }
        await deleteTasks(tasksToArchive.map(t => t.id));
        toast({ title: "Tasks Archived", description: `${tasksToArchive.length} tasks moved to your File Manager.` });
    } catch(error: any) {
        setTasks(originalTasks);
        toast({ variant: 'destructive', title: 'Archive failed.', description: error.message });
    }
  };


  const columns: { title: string, status: TaskStatus }[] = [
    { title: 'To Do', status: 'todo' },
    { title: 'In Progress', status: 'inProgress' },
    { title: 'Done', status: 'done' },
  ];

  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <>
      <div className="p-4 sm:p-6 flex flex-col items-center h-full">
        <header className="text-center mb-6">
          <h1 className="text-3xl font-bold font-headline text-primary">To-Do List</h1>
          <p className="text-muted-foreground">Drag and drop tasks to change their status.</p>
           {selectedTaskIds.length > 0 && (
                <div className="mt-4 flex justify-center items-center gap-2">
                    <span className="text-sm font-medium">{selectedTaskIds.length} selected</span>
                    <Button variant="outline" size="sm" onClick={handleArchiveSelected}><Archive className="mr-2 h-4 w-4" /> Archive</Button>
                    <Button variant="destructive" size="sm" onClick={handleDeleteSelected}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
                </div>
            )}
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl mt-6">
          {columns.map(({ title, status }) => (
            <TaskColumn
              key={status}
              title={title}
              status={status}
              tasks={tasks.filter(t => t.status === status).sort((a,b) => a.position - b.position)}
              onAddTask={status === 'todo' ? handleAddTask : undefined}
              onDropTask={onDropTask}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onMakeProjectTask={handleMakeProject}
              onMoveCard={onMoveCard}
              onToggleComplete={onToggleComplete}
              selectedTaskIds={selectedTaskIds}
              onToggleSelect={handleToggleSelect}
              onToggleSelectAll={handleToggleSelectAll}
            />
          ))}
        </div>
      </div>
      
      <NewTaskDialog
        isOpen={isTaskDialogOpen}
        onOpenChange={setIsTaskDialogOpen}
        onTaskUpdate={handleTaskSaved}
        onTaskCreate={handleTaskSaved}
        taskToEdit={taskToEdit}
        projectId="inbox"
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
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
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
                    This will permanently delete {selectedTaskIds.length} task(s). This cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmBulkDelete} className="bg-destructive hover:bg-destructive/90">
                    Delete Selected
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
