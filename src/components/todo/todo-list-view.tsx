
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MoreVertical, Pencil, Trash2, LoaderCircle, Plus, Briefcase, ListTodo, Archive, ArrowDownUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getTodos, addTodo as saveTodo, updateTodo, deleteTodo as deleteTodoFromDb, updateTodosStatus, deleteTodos } from '@/services/todo-service';
import { type Event as TaskEvent, type Project } from '@/types/calendar-types';
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
import { Checkbox } from '../ui/checkbox';

export function ToDoListView() {
  const [todos, setTodos] = useState<TaskEvent[]>([]);
  const [newTodoText, setNewTodoText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [todoToDelete, setTodoToDelete] = useState<TaskEvent | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);
  
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [initialDialogData, setInitialDialogData] = useState({});
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [taskToConvert, setTaskToConvert] = useState<TaskEvent | null>(null);


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

  const handleAddTodo = async () => {
    if (!newTodoText.trim() || !user) return;

    try {
      const newTodoData: Omit<TaskEvent, 'id'> = {
        title: newTodoText.trim(),
        status: 'todo',
        position: todos.length,
        userId: user.uid,
        isTodoItem: true, // Mark as a to-do item
      };
      const savedTodo = await saveTodo(newTodoData);
      setTodos(prev => [savedTodo, ...prev]);
      setNewTodoText('');
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save new to-do.' });
    }
  };

  const handleStartEdit = (todo: TaskEvent) => {
    setEditingId(todo.id);
    setEditingText(todo.title);
  };
  
  const handleUpdateTodo = async () => {
    if (!editingId || !editingText.trim()) {
      setEditingId(null);
      return;
    }
    const todoToUpdate = todos.find(t => t.id === editingId);
    if (!todoToUpdate || todoToUpdate.title === editingText.trim()) {
      setEditingId(null);
      return;
    }

    const updatedTodo = { ...todoToUpdate, title: editingText.trim() };
    setTodos(prev => prev.map(t => t.id === editingId ? updatedTodo : t));
    
    try {
      await updateTodo(editingId, { title: editingText.trim() });
    } catch (error) {
      setTodos(prev => prev.map(t => t.id === editingId ? todoToUpdate : t));
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update item.' });
    } finally {
      setEditingId(null);
    }
  };

  const handleToggleComplete = async (todo: TaskEvent) => {
    const originalTodos = [...todos];
    const newStatus = todo.status === 'done' ? 'todo' : 'done';
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, status: newStatus } : t));
    try {
      await updateTodo(todo.id, { status: newStatus });
    } catch (error) {
      setTodos(originalTodos);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update status.' });
    }
  };

  const handleDeleteTodo = async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (todo) setTodoToDelete(todo);
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    const originalTodos = [...todos];
    setTodos(todos.filter(t => t.id !== taskToDelete.id));
    try {
      await deleteTodoFromDb(taskToDelete.id);
    } catch (error) {
      setTodos(originalTodos);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the to-do.' });
    } finally {
      setTodoToDelete(null);
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
      await handleDeleteTodo(task.id);
      toast({ title: 'Archived', description: 'To-Do item saved to File Manager.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Archive Failed', description: error.message });
    }
  };
  
  const handleSchedule = (task: TaskEvent) => {
    router.push(`/master-mind?title=${encodeURIComponent(task.title)}&notes=${encodeURIComponent(task.description || '')}`);
  };
  
   const handleDeleteSelected = () => {
    if (selectedTaskIds.length > 0) {
      setIsBulkDeleteAlertOpen(true);
    }
  };

  const handleConfirmBulkDelete = async () => {
    const originalTodos = [...todos];
    setTodos(prev => prev.filter(t => !selectedTaskIds.includes(t.id)));
    try {
      await deleteTodos(selectedTaskIds);
      toast({ title: `${selectedTaskIds.length} tasks deleted.` });
      setSelectedTaskIds([]);
    } catch (error: any) {
      setTodos(originalTodos);
      toast({ variant: 'destructive', title: 'Bulk delete failed.', description: error.message });
    } finally {
      setIsBulkDeleteAlertOpen(false);
    }
  };

  const sortedTodos = [...todos].sort((a,b) => (a.status === 'done' ? 1 : -1) - (b.status === 'done' ? 1 : -1) || (a.position || 0) - (b.position || 0));

  return (
    <>
      <div className="p-4 sm:p-6 flex flex-col items-center h-full">
        <header className="text-center mb-6">
          <h1 className="text-3xl font-bold font-headline text-primary">My To-Do List</h1>
          <p className="text-muted-foreground">A simple place to quickly capture your tasks.</p>
          {selectedTaskIds.length > 0 && (
            <div className="mt-4 flex justify-center items-center gap-2">
              <span className="text-sm font-medium">{selectedTaskIds.length} selected</span>
              <Button variant="destructive" size="sm" onClick={handleDeleteSelected}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
            </div>
          )}
        </header>

        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex w-full items-center space-x-2">
              <Input
                type="text"
                placeholder="Add a new to-do..."
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddTodo(); }}
              />
              <Button onClick={handleAddTodo}>
                <Plus className="mr-2 h-4 w-4" /> Add
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {isLoading ? (
                  <div className="flex items-center justify-center p-8">
                      <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                  </div>
              ) : sortedTodos.length > 0 ? (
                sortedTodos.map(todo => (
                  <div key={todo.id} className="flex items-center gap-2 p-2 rounded-md border bg-muted/50 group">
                    <Checkbox
                      id={`task-${todo.id}`}
                      checked={todo.status === 'done'}
                      onCheckedChange={() => handleToggleComplete(todo)}
                      aria-label={`Mark task ${todo.title} as ${todo.status === 'done' ? 'not done' : 'done'}`}
                    />
                    {editingId === todo.id ? (
                        <Input
                            autoFocus
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onBlur={handleUpdateTodo}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateTodo(); if (e.key === 'Escape') setEditingId(null); }}
                            className="flex-1"
                        />
                    ) : (
                        <label
                          htmlFor={`task-${todo.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <p className={todo.status === 'done' ? 'text-muted-foreground line-through' : ''}>{todo.title}</p>
                        </label>
                    )}
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => handleStartEdit(todo)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleSchedule(todo)}>
                          <Calendar className="mr-2 h-4 w-4" /> Schedule to Calendar
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleMakeProject(todo)}>
                          <Briefcase className="mr-2 h-4 w-4" /> Make a Project
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleArchive(todo)}>
                          <Archive className="mr-2 h-4 w-4" /> Archive as Note
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => handleDeleteTodo(todo)} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                  <p>Your to-do list is empty. Add a task above to get started!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <NewTaskDialog
        isOpen={isNewProjectDialogOpen}
        onOpenChange={setIsNewProjectDialogOpen}
        onProjectCreate={handleProjectCreated}
        contacts={contacts}
        onContactsChange={setContacts}
        projectToEdit={null}
        initialData={initialDialogData}
      />
      
      <AlertDialog open={!!taskToDelete} onOpenChange={() => setTodoToDelete(null)}>
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
