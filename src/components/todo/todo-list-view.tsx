
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MoreVertical, Pencil, Trash2, Archive, LoaderCircle, Plus, Briefcase, Calendar as CalendarIcon, ListChecks } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
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
import { getTodos, addTodo, updateTodo, deleteTodo as deleteTodoFromDb, updateTodoPositions, deleteTodos, updateTodosStatus } from '@/services/todo-service';
import { type Event as TaskEvent, type TaskStatus, type Project } from '@/types/calendar';
import { archiveTaskAsFile } from '@/services/file-service';
import { addProject } from '@/services/project-service';
import { getContacts, type Contact } from '@/services/contact-service';
import { NewTaskDialog } from '@/components/tasks/NewTaskDialog';
import { TaskColumn } from '../tasks/TaskColumn';
import { Input } from '../ui/input';

export function ToDoListView() {
  const [todos, setTodos] = useState<TaskEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [taskToEdit, setTaskToEdit] = useState<TaskEvent | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<TaskEvent | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);
  
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [initialDialogData, setInitialDialogData] = useState<Partial<TaskEvent>>({});
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [taskToConvert, setTaskToConvert] = useState<TaskEvent | null>(null);
  const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');


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
      const [userTodos, userContacts] = await Promise.all([
        getTodos(user.uid),
        getContacts(user.uid),
      ]);
      setTodos(userTodos);
      setContacts(userContacts);
    } catch (error) {
      console.error("Failed to load to-do data:", error);
      toast({
        variant: 'destructive',
        title: 'Failed to load items',
        description: 'Could not retrieve your to-do list.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const handleAddTask = async (title: string, status: TaskStatus) => {
    if (!title.trim() || !user) return;
    try {
        const newTodoData = {
            title: title.trim(),
            status,
            position: todos.filter(t => t.status === status).length,
            isTodoItem: true,
            userId: user.uid,
        }
        const savedTodo = await addTodo(newTodoData);
        setTodos(prev => [...prev, savedTodo]);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save new to-do.' });
    }
  };
  
  const handleTaskSaved = () => {
    loadData();
    setIsNewTaskDialogOpen(false);
  };

  const handleEditTask = (task: TaskEvent) => {
    setTaskToEdit(task);
    setIsNewTaskDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      await deleteTodoFromDb(taskToDelete.id);
      loadData();
      toast({ title: 'Task Deleted' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the to-do.' });
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
    if (!user || !taskToConvert) return;
    try {
        const newProject = await addProject({ ...projectData, status: 'planning', userId: user.uid, createdAt: new Date() });
        await deleteTodoFromDb(taskToConvert.id);
        toast({ title: "Project Created", description: `"${newProject.name}" created and original task removed.` });
        loadData();
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
      await deleteTodoFromDb(task.id);
      loadData();
      toast({ title: 'Archived', description: 'To-Do item saved to File Manager.' });
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
    const columnTasks = todos.filter(t => t.status === status);
    const columnTaskIds = columnTasks.map(t => t.id);
    const selectedInColumn = selectedTaskIds.filter(id => columnTaskIds.includes(id));

    if (selectedInColumn.length === columnTasks.length) {
      // Deselect all from this column
      setSelectedTaskIds(prev => prev.filter(id => !columnTaskIds.includes(id)));
    } else {
      // Select all from this column
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

  const handleMarkSelectedDone = async () => {
    if (selectedTaskIds.length === 0) return;
    
    const originalTasks = [...todos];
    setTodos(prev => prev.map(t => selectedTaskIds.includes(t.id) ? { ...t, status: 'done' } : t));
    
    try {
        await updateTodosStatus(selectedTaskIds, true);
        toast({ title: 'Tasks Updated', description: `${selectedTaskIds.length} task(s) marked as done.` });
        setSelectedTaskIds([]);
    } catch (error: any) {
        setTodos(originalTasks);
        toast({ variant: 'destructive', title: 'Bulk Update Failed', description: error.message });
    }
  };

  const tasksByStatus = useMemo(() => ({
    todo: todos.filter(t => t.status === 'todo'),
    inProgress: todos.filter(t => t.status === 'inProgress'),
    done: todos.filter(t => t.status === 'done'),
  }), [todos]);

  const onDropTask = useCallback(async (item: TaskEvent, newStatus: TaskStatus) => {
    if (item.status === newStatus) return;
    const originalTasks = [...todos];
    setTodos(prev => prev.map(t => t.id === item.id ? { ...t, status: newStatus } : t));
    try {
        await updateTodo(item.id, { status: newStatus });
    } catch (error) {
        setTodos(originalTasks);
        toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not move the task.' });
    }
  }, [todos, toast]);

  const onMoveCard = useCallback(async (dragId: string, hoverId: string) => {
    const dragTask = todos.find(t => t.id === dragId);
    const hoverTask = todos.find(t => t.id === hoverId);
    if (!dragTask || !hoverTask || dragTask.status !== hoverTask.status) return;

    const dragIndex = todos.findIndex(t => t.id === dragId);
    const hoverIndex = todos.findIndex(t => t.id === hoverId);

    const newTasks = [...todos];
    const [draggedItem] = newTasks.splice(dragIndex, 1);
    newTasks.splice(hoverIndex, 0, draggedItem);
    
    const tasksInColumn = newTasks.filter(t => t.status === dragTask.status);
    const updates = tasksInColumn.map((task, index) => ({
        id: task.id,
        position: index,
        status: task.status,
    }));
    
    setTodos(newTasks);
    await updateTodoPositions(updates);
  }, [todos]);

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
          <p className="text-muted-foreground">Drag and drop your tasks to change their status.</p>
        </header>

        <div className="w-full max-w-7xl flex-1 space-y-4">
          <div className="flex justify-end gap-2">
            {selectedTaskIds.length > 0 && (
              <Button variant="destructive" onClick={handleDeleteSelected}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete Selected ({selectedTaskIds.length})
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <TaskColumn 
              status="todo" 
              tasks={tasksByStatus.todo}
              onAddTask={(title: string) => handleAddTask(title, 'todo')}
              onDropTask={onDropTask} 
              onMoveCard={onMoveCard}
              onTaskDelete={(taskId) => {
                const task = todos.find(t => t.id === taskId);
                if (task) setTaskToDelete(task);
              }}
              onToggleComplete={(taskId) => {
                const task = todos.find(t => t.id === taskId);
                if (task) onDropTask(task, 'done');
              }}
              onEdit={handleEditTask}
              onMakeProject={handleMakeProject}
              onArchive={handleArchive}
              selectedTaskIds={selectedTaskIds}
              onToggleSelect={handleToggleSelect}
              onToggleSelectAll={handleToggleSelectAll}
            />
             <TaskColumn 
              status="inProgress" 
              tasks={tasksByStatus.inProgress}
              onDropTask={onDropTask} 
              onMoveCard={onMoveCard}
              onTaskDelete={(taskId) => {
                const task = todos.find(t => t.id === taskId);
                if (task) setTaskToDelete(task);
              }}
              onToggleComplete={(taskId) => {
                const task = todos.find(t => t.id === taskId);
                if (task) onDropTask(task, 'done');
              }}
              onEdit={handleEditTask}
              onMakeProject={handleMakeProject}
              onArchive={handleArchive}
              selectedTaskIds={selectedTaskIds}
              onToggleSelect={handleToggleSelect}
              onToggleSelectAll={handleToggleSelectAll}
            />
             <TaskColumn 
              status="done" 
              tasks={tasksByStatus.done}
              onDropTask={onDropTask} 
              onMoveCard={onMoveCard}
              onTaskDelete={(taskId) => {
                const task = todos.find(t => t.id === taskId);
                if (task) setTaskToDelete(task);
              }}
              onToggleComplete={(taskId) => {
                const task = todos.find(t => t.id === taskId);
                if (task) onDropTask(task, 'todo');
              }}
              onEdit={handleEditTask}
              onMakeProject={handleMakeProject}
              onArchive={handleArchive}
              selectedTaskIds={selectedTaskIds}
              onToggleSelect={handleToggleSelect}
              onToggleSelectAll={handleToggleSelectAll}
            />
          </div>
        </div>
      </div>
      <NewTaskDialog
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
