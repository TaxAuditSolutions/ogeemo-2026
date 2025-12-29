
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MoreVertical, Pencil, Trash2, LoaderCircle, Plus, Briefcase, ListTodo, Archive, ArrowDownUp, Calendar, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getTodos, addTodo as saveTodo, updateTodo, deleteTodo as deleteTodoFromDb, updateTodoPositions, updateTodosStatus, deleteTodos } from '@/services/todo-service';
import { type Event as TaskEvent, type Project, type TaskStatus } from '@/types/calendar-types';
import { archiveTaskAsFile } from '@/services/file-service';
import { addProject } from '@/services/project-service';
import { getContacts, type Contact } from '@/services/contact-service';
import { NewTaskDialog } from '@/components/tasks/NewTaskDialog';
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
import { Input } from '../ui/input';
import { TaskCard } from '../tasks/TaskCard';
import { TaskColumn } from '../tasks/TaskColumn';

export function ToDoListView() {
  const [todos, setTodos] = useState<TaskEvent[]>([]);
  const [newTodoText, setNewTodoText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [taskToDelete, setTaskToDelete] = useState<TaskEvent | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);
  
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [initialDialogData, setInitialDialogData] = useState({});
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [taskToConvert, setTaskToConvert] = useState<TaskEvent | null>(null);
  const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskEvent | null>(null);


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
  
  const handleAddTask = () => {
    setTaskToEdit(null);
    setIsNewTaskDialogOpen(true);
  };
  
  const handleTaskSaved = () => {
    loadData(); // Refresh data after save/update
    setIsNewTaskDialogOpen(false);
  };
  
  const onDropTask = useCallback(async (item: TaskEvent, newStatus: TaskStatus) => {
    if (item.status === newStatus) return;

    const originalTasks = [...todos];
    setTodos(prev => prev.map(t => t.id === item.id ? { ...t, status: newStatus } : t));
    
    try {
        await updateTodo(item.id, { status: newStatus });
    } catch (error: any) {
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
  
  const tasksByStatus = useMemo(() => {
    const sortedTasks = [...todos].sort((a, b) => a.position - b.position);
    return {
        todo: sortedTasks.filter(t => t.status === 'todo'),
        inProgress: sortedTasks.filter(t => t.status === 'inProgress'),
        done: sortedTasks.filter(t => t.status === 'done'),
    };
  }, [todos]);

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
        loadData(); // Refresh the to-do list
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
  
  const handleToggleSelect = (taskId: string) => {
    setSelectedTaskIds(prev =>
        prev.includes(taskId)
            ? prev.filter(id => id !== taskId)
            : [...prev, id]
    );
  };
  
  const handleToggleSelectAll = (status: TaskStatus) => {
    const columnTaskIds = tasks.filter(t => t.status === status).map(t => t.id);
    const selectedInColumn = selectedTaskIds.filter(id => columnTaskIds.includes(id));

    if (selectedInColumn.length === columnTaskIds.length) {
      // Deselect all in this column
      setSelectedTaskIds(prev => prev.filter(id => !columnTaskIds.includes(id)));
    } else {
      // Select all in this column
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

  return (
    <>
      <div className="p-4 sm:p-6 flex flex-col h-full items-center">
        <header className="text-center mb-6">
          <h1 className="text-3xl font-bold font-headline text-primary">To-Do List</h1>
          <p className="text-muted-foreground">Drag tasks between columns to update their status.</p>
          <div className="mt-4 flex justify-center gap-2">
            <Button onClick={handleAddTask}><Plus className="mr-2 h-4 w-4"/> Add Task</Button>
            {selectedTaskIds.length > 0 && (
                <Button variant="destructive" onClick={handleDeleteSelected}>
                    <Trash2 className="mr-2 h-4 w-4"/> Delete Selected ({selectedTaskIds.length})
                </Button>
            )}
          </div>
        </header>

        {isLoading ? (
            <div className="flex items-center justify-center h-full pt-16">
                <LoaderCircle className="h-8 w-8 animate-spin" />
            </div>
        ) : (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl mt-6">
                <TaskColumn 
                    status="todo" 
                    tasks={tasksByStatus.todo}
                    onAddTask={handleAddTask}
                    onDropTask={onDropTask} 
                    onMoveCard={onMoveCard}
                    onTaskDelete={(taskId) => { const task = todos.find(t => t.id === taskId); if (task) setTaskToDelete(task); }}
                    onToggleComplete={() => {}}
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
                    onTaskDelete={(taskId) => { const task = todos.find(t => t.id === taskId); if (task) setTaskToDelete(task); }}
                    onToggleComplete={() => {}}
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
                    onTaskDelete={(taskId) => { const task = todos.find(t => t.id === taskId); if (task) setTaskToDelete(task); }}
                    onToggleComplete={(taskId) => { const task = todos.find(t => t.id === taskId); if(task) onDropTask(task, 'todo') }}
                    onEdit={handleEditTask}
                    onMakeProject={handleMakeProject}
                    onArchive={handleArchive}
                    selectedTaskIds={selectedTaskIds}
                    onToggleSelect={handleToggleSelect}
                    onToggleSelectAll={handleToggleSelectAll}
                />
            </div>
        )}
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
            projectId={'inbox'}
            taskToEdit={taskToEdit}
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
                    Delete Selected
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
