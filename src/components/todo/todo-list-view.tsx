
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MoreVertical, Pencil, Trash2, LoaderCircle, Plus, Briefcase, Archive, ListChecks } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { getTodos, addTodo as saveTodo, updateTodo, deleteTodo as deleteTodoFromDb, updateTodoPositions, deleteTodos } from '@/services/todo-service';
import { type Event as TaskEvent } from '@/types/calendar-types';
import { archiveTaskAsFile } from '@/services/file-service';
import { addProject, type Project } from '@/services/project-service';
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
import { Checkbox } from '../ui/checkbox';

export function ToDoListView() {
  const [todos, setTodos] = useState<TaskEvent[]>([]);
  const [newTodoText, setNewTodoText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [taskToDelete, setTaskToDelete] = useState<TaskEvent | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);
  
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [initialDialogData, setInitialDialogData] = useState<Partial<TaskEvent>>({});
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
    setInitialDialogData({ isTodoItem: true });
    setIsNewTaskDialogOpen(true);
  };
  
  const handleTaskSaved = () => {
    loadData(); // Refresh data after save/update
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
            : [...prev, taskId]
    );
  };
  
  const handleToggleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked) {
        setSelectedTaskIds(todos.map(t => t.id));
    } else {
        setSelectedTaskIds([]);
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
        await updateTodosStatus(selectedTaskIds, 'done');
        toast({ title: 'Tasks Updated', description: `${selectedTaskIds.length} task(s) marked as done.` });
        setSelectedTaskIds([]);
    } catch (error: any) {
        setTodos(originalTasks);
        toast({ variant: 'destructive', title: 'Bulk Update Failed', description: error.message });
    }
  };

  const sortedTasks = useMemo(() => {
    return [...todos].sort((a, b) => {
        if (a.createdAt && b.createdAt) {
            return b.createdAt.getTime() - a.createdAt.getTime();
        }
        return 0;
    });
  }, [todos]);

  const allSelected = todos.length > 0 && selectedTaskIds.length === todos.length;
  const someSelected = selectedTaskIds.length > 0 && !allSelected;


  return (
    <>
      <div className="p-4 sm:p-6 flex flex-col items-center h-full">
        <header className="text-center mb-6">
          <h1 className="text-3xl font-bold font-headline text-primary">To-Do List</h1>
          <p className="text-muted-foreground">A simple place to quickly capture your tasks.</p>
        </header>
        
        <Card className="w-full max-w-4xl">
           <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>My Tasks</CardTitle>
              {selectedTaskIds.length > 0 ? (
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{selectedTaskIds.length} selected</span>
                    <Button variant="outline" size="sm" onClick={handleMarkSelectedDone}>Mark as Done</Button>
                    <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>Delete Selected</Button>
                </div>
              ) : (
                <Button onClick={handleAddTask}>
                  <Plus className="mr-2 h-4 w-4" /> Add Task
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : todos.length > 0 ? (
              <div className="border rounded-md">
                 <div className="flex items-center p-2 border-b bg-muted/50">
                    <Checkbox
                        className="ml-4 mr-4"
                        checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                        onCheckedChange={handleToggleSelectAll}
                    />
                    <p className="text-sm font-semibold">Task</p>
                 </div>
                 {sortedTasks.map(todo => (
                    <div key={todo.id} className="group flex items-center p-2 border-b last:border-b-0 hover:bg-muted/50">
                        <Checkbox
                            className="ml-4 mr-4"
                            checked={selectedTaskIds.includes(todo.id)}
                            onCheckedChange={() => handleToggleSelect(todo.id)}
                        />
                        <p 
                          className="flex-1 cursor-pointer"
                          onClick={() => handleEditTask(todo)}
                        >
                            {todo.title}
                        </p>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => handleEditTask(todo)}>
                                    <Pencil className="mr-2 h-4 w-4"/> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleMakeProject(todo)}>
                                  <Briefcase className="mr-2 h-4 w-4" /> Make a Project
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleArchive(todo)}>
                                  <Archive className="mr-2 h-4 w-4" /> Archive as Note
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => setTaskToDelete(todo)} className="text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete Permanently
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground p-12 border-2 border-dashed rounded-lg">
                <p>Your to-do list is empty. Add a task to get started!</p>
              </div>
            )}
          </CardContent>
        </Card>
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
                    Delete Selected
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
