
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, MoreVertical, Trash2, Briefcase, ListChecks, LoaderCircle, Calendar, Pencil, CheckCircle, Info } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getTodos, addTodo, deleteTodo, updateTodo, deleteTodos, updateTodosStatus, type ToDoItem } from '@/services/todo-service';
import { NewTaskDialog } from '../tasks/NewTaskDialog';
import { type Project, type Event as TaskEvent } from '@/types/calendar-types';
import { addProject } from '@/services/project-service';
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
import { Label } from '@/components/ui/label';

export function ToDoListView() {
  const [todos, setTodos] = useState<ToDoItem[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [initialDialogData, setInitialDialogData] = useState({});
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
  const [todoToDelete, setTodoToDelete] = useState<ToDoItem | null>(null);

  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const loadTodos = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const userTodos = await getTodos(user.uid);
      setTodos(userTodos);
    } catch (error) {
      console.error("Failed to load to-dos:", error);
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
    loadTodos();
  }, [loadTodos]);
  
  const sortedTodos = useMemo(() => {
    return [...todos].sort((a, b) => {
        if (a.completed === b.completed) {
          return b.createdAt.getTime() - a.createdAt.getTime();
        }
        return a.completed ? 1 : -1;
      });
  }, [todos]);

  const handleAddTodo = async () => {
    if (!newTodo.trim() || !user) return;

    try {
      const savedTodo = await addTodo({
        text: newTodo.trim(),
        userId: user.uid,
        createdAt: new Date(),
        completed: false,
      });
      setTodos(prev => [savedTodo, ...prev]);
      setNewTodo('');
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save new to-do item.' });
    }
  };

  const handleDeleteTodo = async (todo: ToDoItem) => {
    const originalTodos = [...todos];
    setTodos(todos.filter(t => t.id !== todo.id));
    try {
      await deleteTodo(todo.id);
    } catch (error) {
      setTodos(originalTodos);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the to-do item.' });
    }
  };
  
  const handleStartEdit = (todo: ToDoItem) => {
    setEditingId(todo.id);
    setEditingText(todo.text);
  };
  
  const handleUpdateTodo = async () => {
    if (!editingId || !editingText.trim()) {
      setEditingId(null);
      return;
    }
    const todoToUpdate = todos.find(t => t.id === editingId);
    if (!todoToUpdate || todoToUpdate.text === editingText.trim()) {
      setEditingId(null);
      return;
    }

    const updatedTodo = { ...todoToUpdate, text: editingText.trim() };
    setTodos(prev => prev.map(t => t.id === editingId ? updatedTodo : t));
    
    try {
      await updateTodo(editingId, { text: editingText.trim() });
    } catch (error) {
      setTodos(prev => prev.map(t => t.id === editingId ? todoToUpdate : t));
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update item.' });
    } finally {
      setEditingId(null);
    }
  };
  
  const handleMakeTask = (todo: ToDoItem) => {
    router.push(`/master-mind?title=${encodeURIComponent(todo.text)}`);
  };

  const handleMakeProject = (todo: ToDoItem) => {
    setInitialDialogData({ name: todo.text });
    setIsNewProjectDialogOpen(true);
  };
  
  const handleProjectCreated = async (projectData: Omit<Project, 'id' | 'createdAt' | 'userId'>, tasks: Omit<TaskEvent, 'id' | 'userId' | 'projectId'>[]) => {
    if (!user) return;
    try {
        const newProject = await addProject({ ...projectData, status: 'planning', userId: user.uid, createdAt: new Date() });
        toast({ title: "Project Created", description: `"${newProject.name}" has been successfully created.` });
        router.push(`/projects/${newProject.id}/tasks`);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Failed to create project", description: error.message });
    }
  };
  
  const handleToggleComplete = async (todo: ToDoItem) => {
    const updatedTodo = { ...todo, completed: !todo.completed };
    setTodos(prev => prev.map(t => t.id === todo.id ? updatedTodo : t));
    try {
      await updateTodo(todo.id, { completed: updatedTodo.completed });
    } catch (error) {
      setTodos(prev => prev.map(t => t.id === todo.id ? todo : t));
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update completion status.' });
    }
  };
  
  const handleConfirmDelete = async () => {
    if (!todoToDelete) return;
    handleDeleteTodo(todoToDelete);
    setTodoToDelete(null);
  };
  
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };
  
  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    setSelectedIds(checked ? todos.map(t => t.id) : []);
  };
  
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    const originalTodos = [...todos];
    setTodos(prev => prev.filter(t => !selectedIds.includes(t.id)));
    try {
      await deleteTodos(selectedIds);
      toast({ title: `${selectedIds.length} item(s) deleted.` });
      setSelectedIds([]);
    } catch (error) {
      setTodos(originalTodos);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete selected items.' });
    }
  };
  
  const handleMarkSelectedDone = async () => {
    if (selectedIds.length === 0) return;
    setTodos(prev => prev.map(t => selectedIds.includes(t.id) ? { ...t, completed: true } : t));
    try {
      await updateTodosStatus(selectedIds, true);
      setSelectedIds([]);
    } catch (error) {
      loadTodos();
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update items.' });
    }
  };
  
  const allSelected = todos.length > 0 && selectedIds.length === todos.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < todos.length;

  return (
    <>
      <div className="p-4 sm:p-6 flex flex-col items-center h-full">
        <header className="text-center mb-6">
            <div className="flex items-center justify-center gap-2">
                <h1 className="text-3xl font-bold font-headline text-primary">A To Do List</h1>
                <Button variant="ghost" size="icon" onClick={() => setIsInfoDialogOpen(true)}>
                    <Info className="h-5 w-5 text-muted-foreground" />
                </Button>
            </div>
          <p className="text-muted-foreground"> A simple place to quickly make a note of things to do. To change a thought to reality, use the 3 dot menu to schedule the event to your calendar.</p>
        </header>

        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>My To-Dos</CardTitle>
            <div className="flex w-full items-center space-x-2 pt-2">
              <Input
                type="text"
                placeholder="e.g., Follow up with Jane Doe..."
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddTodo(); }}
              />
              <Button onClick={handleAddTodo}>
                <Plus className="mr-2 h-4 w-4" /> Add
              </Button>
            </div>
            
            <div className="flex items-center justify-between pt-4">
                <div className="flex items-center gap-2">
                    <Checkbox
                        id="select-all"
                        checked={allSelected ? true : (someSelected ? 'indeterminate' : false)}
                        onCheckedChange={handleSelectAll}
                    />
                    <Label htmlFor="select-all" className="text-sm font-medium">Select All</Label>
                </div>
                {selectedIds.length > 0 && (
                    <div className="flex items-center gap-2">
                         <Button variant="outline" size="sm" onClick={handleMarkSelectedDone}>Mark as Done</Button>
                         <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>Delete Selected</Button>
                    </div>
                )}
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
                  <div key={todo.id} className="flex items-center gap-2 p-2 rounded-md border bg-muted/50">
                    <Checkbox
                        checked={selectedIds.includes(todo.id)}
                        onCheckedChange={() => handleToggleSelect(todo.id)}
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
                        <p className={cn("flex-1", todo.completed && "line-through text-muted-foreground")}>{todo.text}</p>
                    )}
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => handleToggleComplete(todo)}>
                          <CheckCircle className="mr-2 h-4 w-4" /> {todo.completed ? "Mark as Not Done" : "Mark as Done"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleStartEdit(todo)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleMakeTask(todo)}>
                          <Calendar className="mr-2 h-4 w-4" /> Schedule to calendar
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleMakeProject(todo)}>
                          <Briefcase className="mr-2 h-4 w-4" /> Make a Project
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setTodoToDelete(todo)} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Permanently
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                  <p>Your to-do list is empty. Add a new item above to get started!</p>
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
        contacts={[]}
        onContactsChange={() => {}}
        projectToEdit={null}
        initialData={initialDialogData}
      />
      
      <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>About the To-Do List</DialogTitle>
                <DialogDescription>
                    A quick guide to using this simple but powerful tool.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4 text-sm">
                <div>
                    <h4 className="font-semibold mb-2">Capture Everything</h4>
                    <p className="text-muted-foreground">
                        The to-do list is your quick-capture inbox. Use it to jot down any task or idea that comes to mind without breaking your workflow. Don't worry about details yet—just get it out of your head and onto the list.
                    </p>
                </div>
                <div>
                    <h4 className="font-semibold mb-2">From Thought to Action</h4>
                    <p className="text-muted-foreground">
                        A simple list is good, but a plan is better. Use the 3-dot menu (`...`) next to any item to take action.
                    </p>
                </div>
                <div>
                    <h4 className="font-semibold mb-2">Schedule to Calendar</h4>
                    <p className="text-muted-foreground">
                        The most powerful feature is "Schedule to calendar". This sends your to-do item directly to the Task & Event Manager, where you can assign it a specific date and time. Once scheduled, it will appear on your calendar, allowing you to visually drag and drop it to plan your time effectively. This is the key to turning a simple thought into a concrete part of your schedule.
                    </p>
                </div>
            </div>
            <DialogFooter>
                <Button onClick={() => setIsInfoDialogOpen(false)}>Close</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!todoToDelete} onOpenChange={() => setTodoToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete the to-do item: "{todoToDelete?.text}".
                </AlertDialogDescription>
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
