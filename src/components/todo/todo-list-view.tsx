
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MoreVertical, Pencil, Trash2, Archive, LoaderCircle, Plus, Briefcase, Calendar as CalendarIcon, ListChecks, ListTodo } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getTodos, deleteTodo, deleteTodos, archiveTodos, type TaskEvent } from '@/services/todo-service';
import { type Project } from '@/types/calendar-types';
import { getProjects, addProject } from '@/services/project-service';
import { getContacts, type Contact } from '@/services/contact-service';
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog';
import { NewTaskDialog } from '@/components/tasks/NewTaskDialog';
import { ProjectManagementHeader } from '../tasks/ProjectManagementHeader';

export function ToDoListView() {
  const [todos, setTodos] = useState<TaskEvent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [taskToEdit, setTaskToEdit] = useState<TaskEvent | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<TaskEvent | null>(null);
  const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false);
  
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [taskToConvert, setTaskToConvert] = useState<TaskEvent | null>(null);
  const [initialDialogData, setInitialDialogData] = useState({});
  const [contacts, setContacts] = useState<Contact[]>([]);
  
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);
  const [isBulkArchiveAlertOpen, setIsBulkArchiveAlertOpen] = useState(false);

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
      const [userTodos, userProjects, userContacts] = await Promise.all([
        getTodos(user.uid),
        getProjects(user.uid),
        getContacts(user.uid),
      ]);
      setTodos(userTodos);
      setProjects(userProjects);
      setContacts(userContacts);
    } catch (error: any) {
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
  
  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      await deleteTodo(taskToDelete.id);
      setTodos(prev => prev.filter(t => t.id !== taskToDelete.id));
      toast({ title: "Task Deleted" });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete task.' });
    } finally {
      setTaskToDelete(null);
    }
  };

  const handleEdit = (task: TaskEvent) => {
    setTaskToEdit(task);
    setIsNewTaskDialogOpen(true);
  };
  
  const handleTaskSaved = () => {
    loadData();
    setIsNewTaskDialogOpen(false);
    setTaskToEdit(null);
  };
  
  const handleSchedule = (task: TaskEvent) => {
    router.push(`/master-mind?eventId=${task.id}`);
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
          await deleteTodo(taskToConvert.id);
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
      await archiveTodoAsFile(user.uid, task);
      await deleteTodo(task.id);
      loadData();
      toast({ title: 'Archived', description: 'Task saved to File Manager.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Archive Failed', description: error.message });
    }
  };
  
  const handleConfirmBulkDelete = async () => {
    if (selectedTaskIds.length === 0) return;
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
  
  const handleConfirmBulkArchive = async () => {
    if (selectedTaskIds.length === 0 || !user) return;
    const tasksToArchive = todos.filter(t => selectedTaskIds.includes(t.id));
    try {
      await archiveTodos(user.uid, tasksToArchive);
      toast({ title: `${tasksToArchive.length} tasks archived.` });
      setSelectedTaskIds([]);
      loadData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Bulk archive failed.', description: error.message });
    } finally {
      setIsBulkArchiveAlertOpen(false);
    }
  };

  return (
    <>
      <div className="p-4 sm:p-6 flex flex-col items-center h-full">
        <header className="text-center mb-6">
          <h1 className="text-3xl font-bold font-headline text-primary">To-Do List</h1>
          <p className="text-muted-foreground">Your central place for all unassigned tasks.</p>
          <div className="mt-4">
              <ProjectManagementHeader />
          </div>
        </header>

        <Card className="w-full max-w-4xl">
          <CardHeader>
             <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Your To-Do Items</CardTitle>
                  <CardDescription>
                    You have {todos.length} item(s) on your list.
                  </CardDescription>
                </div>
                 <div className="flex gap-2">
                    {selectedTaskIds.length > 0 && (
                        <>
                            <Button variant="outline" size="sm" onClick={() => setIsBulkArchiveAlertOpen(true)}><Archive className="mr-2 h-4 w-4" />Archive Selected</Button>
                            <Button variant="destructive" size="sm" onClick={() => setIsBulkDeleteAlertOpen(true)}><Trash2 className="mr-2 h-4 w-4" />Delete Selected</Button>
                        </>
                    )}
                    <Button onClick={() => setIsNewTaskDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Add To-Do
                    </Button>
                 </div>
              </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-48">
                <LoaderCircle className="h-8 w-8 animate-spin" />
              </div>
            ) : todos.length > 0 ? (
                <div className="space-y-2">
                    {todos.map(task => (
                        <div key={task.id} className="flex items-center gap-2 p-2 rounded-md border bg-card hover:bg-muted/50">
                            <Checkbox 
                                onCheckedChange={() => setSelectedTaskIds(prev => prev.includes(task.id) ? prev.filter(id => id !== task.id) : [...prev, task.id])}
                                checked={selectedTaskIds.includes(task.id)}
                            />
                            <span className="flex-1 cursor-pointer" onClick={() => handleEdit(task)}>{task.title}</span>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={() => handleEdit(task)}><Pencil className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleSchedule(task)}><Calendar className="mr-2 h-4 w-4"/>Schedule to Calendar</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleMakeProject(task)}><Briefcase className="mr-2 h-4 w-4"/>Convert to Project</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleArchive(task)}><Archive className="mr-2 h-4 w-4"/>Archive as Note</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={() => setTaskToDelete(task)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ))}
                </div>
            ) : (
              <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                <p>Your to-do list is empty. Add a task to get started!</p>
              </div>
            )}
          </CardContent>
        </Card>
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
            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the task "{taskToDelete?.title}".</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       <AlertDialog open={isBulkDeleteAlertOpen} onOpenChange={setIsBulkDeleteAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete {selectedTaskIds.length} task(s).</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmBulkDelete} className="bg-destructive hover:bg-destructive/90">Delete Selected</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBulkArchiveAlertOpen} onOpenChange={setIsBulkArchiveAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Archive Selected Tasks?</AlertDialogTitle><AlertDialogDescription>This will save the selected {selectedTaskIds.length} task(s) as notes in your File Manager and remove them from your To-Do list.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmBulkArchive}>Archive Selected</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
