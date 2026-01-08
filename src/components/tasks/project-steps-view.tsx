
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LoaderCircle,
  Plus,
  GripVertical,
  Trash2,
  ArrowLeft,
  Edit,
  MoreVertical,
  BookOpen,
  Save,
  FilePlus,
  Pencil,
  Route,
  Briefcase,
  Archive,
  Calendar as CalendarIcon,
  ListTodo,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Input } from '../ui/input';
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
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogHeader, DialogFooter, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getProjectById, updateProject, addTask, type Project, type ProjectStep, type ProjectTemplate, addProject, getTasksForProject, deleteTask } from '@/services/project-service';
import { DraggableStep } from './DraggableStep';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { type Event as TaskEvent } from '@/types/calendar-types';
import { addMinutes } from 'date-fns';
import { NewTaskDialog } from '@/components/tasks/NewTaskDialog';
import { getContacts, type Contact } from '@/services/contact-service';
import { archiveTaskAsFile } from '@/services/file-service';

export default function ProjectStepsView({ projectId }: { projectId: string }) {
    const [project, setProject] = useState<Project | null>(null);
    const [steps, setSteps] = useState<Partial<ProjectStep>[]>([]);
    const [tasks, setTasks] = useState<TaskEvent[]>([]);
    const [newStepTitle, setNewStepTitle] = useState('');
    const [editingStepId, setEditingStepId] = useState<string | null>(null);
    const [editingStepText, setEditingStepText] = useState('');
    const [stepToDelete, setStepToDelete] = useState<Partial<ProjectStep> | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [isStepDetailDialogOpen, setIsStepDetailDialogOpen] = useState(false);
    const [stepToDetail, setStepToDetail] = useState<Partial<ProjectStep> | null>(null);
    const [stepDetailDescription, setStepDetailDescription] = useState("");

    const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
    const [taskToConvert, setTaskToConvert] = useState<TaskEvent | null>(null);
    const [initialDialogData, setInitialDialogData] = useState({});
    const [contacts, setContacts] = useState<Contact[]>([]);

    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const loadData = useCallback(async () => {
        if (!user || !projectId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const [projectData, tasksData, fetchedContacts] = await Promise.all([
                getProjectById(projectId),
                getTasksForProject(projectId),
                getContacts(user.uid),
            ]);

            if (!projectData) {
                toast({ variant: 'destructive', title: 'Error', description: 'Project not found.' });
                router.push('/projects/all');
                return;
            }
            setProject(projectData);
            setSteps(projectData.steps || []);
            setTasks(tasksData);
            setContacts(fetchedContacts);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to load project data', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [projectId, user, toast, router]);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const handleSaveSteps = useCallback(async (updatedSteps: Partial<ProjectStep>[]) => {
        if (project) {
            try {
                // Ensure all steps have a real ID before saving
                const stepsToSave = updatedSteps.map(step => ({
                    ...step,
                    id: step.id && !step.id.startsWith('temp_') ? step.id : `step_${Date.now()}_${Math.random()}`
                }));
                setSteps(stepsToSave); // Update local state with real IDs
                await updateProject(project.id, { steps: stepsToSave });
                return stepsToSave;
            } catch (error) {
                console.error("Failed to save steps:", error);
                toast({ variant: "destructive", title: "Save failed", description: "Could not save the project plan." });
                return null;
            }
        }
        return null;
    }, [project, toast]);
    
    const handleAddStep = async () => {
        if (!newStepTitle.trim() || !user || !project) {
            setNewStepTitle('');
            return;
        }

        const newStep: Partial<ProjectStep> = {
            id: `temp_${Date.now()}`,
            title: newStepTitle.trim(),
            description: '',
            isCompleted: false,
        };
        
        const newSteps = [...steps, newStep];
        const savedSteps = await handleSaveSteps(newSteps);

        if (savedSteps) {
            const savedNewStep = savedSteps.find(s => s.title === newStep.title && s.id?.startsWith('step_'));
            if (savedNewStep && savedNewStep.id) {
                try {
                    const newTask = await addTask({
                        title: savedNewStep.title!,
                        description: savedNewStep.description,
                        status: 'todo',
                        position: tasks.filter(t => t.status === 'todo').length,
                        projectId: project.id,
                        stepId: savedNewStep.id,
                        userId: user.uid,
                    });
                    setTasks(prev => [...prev, newTask]);
                } catch (taskError: any) {
                    toast({ variant: 'destructive', title: 'Task Creation Failed', description: 'The step was saved, but the task could not be created.' });
                }
            }
        }
        
        setNewStepTitle('');
    };
    
    const handleOpenStepDetails = (step: Partial<ProjectStep>) => {
        setStepToDetail(step);
        setStepDetailDescription(step.description || '');
        setIsStepDetailDialogOpen(true);
    };
    
    const handleSaveStepDetails = async () => {
        if (!stepToDetail || !stepToDetail.title) {
            toast({ variant: "destructive", title: "Title is required." });
            return;
        }
        const updatedSteps = steps.map(s => 
            s.id === stepToDetail.id 
            ? { ...s, title: stepToDetail.title, description: stepDetailDescription } 
            : s
        );
        setSteps(updatedSteps);
        const savedSteps = await handleSaveSteps(updatedSteps);
        
        const correspondingTask = tasks.find(t => t.stepId === stepToDetail.id);
        if (correspondingTask && savedSteps) {
            const updatedStepInSaved = savedSteps.find(s => s.id === stepToDetail.id);
            if (updatedStepInSaved) {
                try {
                    await updateTask(correspondingTask.id, { title: updatedStepInSaved.title, description: updatedStepInSaved.description });
                    setTasks(prev => prev.map(t => t.id === correspondingTask.id ? {...t, title: updatedStepInSaved.title!, description: updatedStepInSaved.description} : t));
                } catch (error) {
                    toast({ variant: 'destructive', title: 'Task Sync Failed', description: 'Could not update the associated task.' });
                }
            }
        }
        setIsStepDetailDialogOpen(false);
    };

    const handleDeleteStep = async () => {
        if (!stepToDelete || !user) return;
        
        const stepIdToDelete = stepToDelete.id;

        const originalSteps = [...steps];
        const updatedSteps = steps.filter(s => s.id !== stepIdToDelete);
        setSteps(updatedSteps);
        
        try {
            const taskToDelete = tasks.find(t => t.stepId === stepIdToDelete);
            if (taskToDelete) {
                await deleteTask(taskToDelete.id);
                setTasks(prev => prev.filter(t => t.id !== taskToDelete.id));
            }
            
            await handleSaveSteps(updatedSteps);
            toast({ title: 'Step Deleted' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not delete the step and associated task.' });
            setSteps(originalSteps);
        } finally {
            setStepToDelete(null);
        }
    };


    const moveStep = useCallback(async (dragIndex: number, hoverIndex: number) => {
        const newSteps = [...steps];
        const [draggedItem] = newSteps.splice(dragIndex, 1);
        newSteps.splice(hoverIndex, 0, draggedItem);
        setSteps(newSteps);
        await handleSaveSteps(newSteps);
    }, [steps, handleSaveSteps]);
    
    const handleStartEditStep = (step: Partial<ProjectStep>) => {
        setEditingStepId(step.id || null);
        setEditingStepText(step.title || '');
    };

    const handleUpdateStepTitle = async () => {
        if (!editingStepId) return;
        const updatedSteps = steps.map(s => s.id === editingStepId ? { ...s, title: editingStepText } : s);
        await handleSaveSteps(updatedSteps);
        
        const taskToUpdate = tasks.find(t => t.stepId === editingStepId);
        if(taskToUpdate) {
            await updateTask(taskToUpdate.id, { title: editingStepText });
            setTasks(prev => prev.map(t => t.id === taskToUpdate.id ? {...t, title: editingStepText} : t));
        }

        setEditingStepId(null);
    };

    const handleMakeProject = (step: Partial<ProjectStep>) => {
      const task = tasks.find(t => t.stepId === step.id) || { title: step.title, description: step.description };
      setInitialDialogData({ name: task.title, description: task.description || '' });
      setTaskToConvert(task as TaskEvent);
      setIsNewProjectDialogOpen(true);
    };

    const handleProjectCreated = async (projectData: Omit<Project, 'id' | 'createdAt' | 'userId'>, tasks: Omit<TaskEvent, 'id' | 'userId' | 'projectId'>[]) => {
      if (!user || !taskToConvert) return;
      try {
          const newProject = await addProject({ ...projectData, status: 'planning', userId: user.uid, createdAt: new Date() });
          await deleteTask(taskToConvert.id);
          toast({ title: "Project Created", description: `"${newProject.name}" has been successfully created.` });
          loadData();
      } catch (error: any) {
          toast({ variant: "destructive", title: "Failed to create project", description: error.message });
      } finally {
          setIsNewProjectDialogOpen(false);
          setTaskToConvert(null);
      }
    };

    const handleScheduleStep = (step: Partial<ProjectStep>) => {
      const task = tasks.find(t => t.stepId === step.id);
      if (task) {
        router.push(`/master-mind?eventId=${task.id}`);
      } else {
        const startTime = new Date();
        const endTime = addMinutes(startTime, 30);
        router.push(`/master-mind?title=${encodeURIComponent(step.title || '')}&description=${encodeURIComponent(step.description || '')}&projectId=${projectId}&stepId=${step.id}&start=${startTime.toISOString()}&end=${endTime.toISOString()}`);
      }
    };
    
    const handleArchiveStep = async (step: Partial<ProjectStep>) => {
        const task = tasks.find(t => t.stepId === step.id);
        if (!user || !task) return;
        try {
            await archiveTaskAsFile(user.uid, task);
            await handleDeleteStep();
            toast({ title: 'Step Archived', description: 'Step content saved to File Manager.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Archive Failed', description: error.message });
        }
    };
    
    const handleAddToTodoList = async (step: Partial<ProjectStep>) => {
        if (!user || !project) return;
        try {
            const newTaskData: Omit<TaskEvent, 'id'> = {
                title: `[${project.name}]: ${step.title}`,
                status: 'todo',
                position: 0,
                userId: user.uid,
                isTodoItem: true,
                projectId: null,
            };
            await addTask(newTaskData);
            toast({ title: "Added to To-Do List", description: `A new entry for "${step.title}" has been created.`});
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to add to To-Do List', description: error.message });
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center p-4">
                <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!project) return null;

    return (
        <>
            <div className="p-4 sm:p-6 h-full flex flex-col items-center">
                <header className="mb-6 w-full max-w-4xl grid grid-cols-3 items-center">
                    <div className="flex justify-start">
                        <Button asChild variant="outline">
                            <Link href="/projects/all">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Project List
                            </Link>
                        </Button>
                    </div>
                    <div className="text-center">
                        <h1 className="text-xl font-bold font-headline text-primary">
                            Project Planner
                        </h1>
                         <div className="mt-2 inline-block rounded-md border-2 border-black bg-white p-2">
                             <h2 className="text-2xl text-foreground font-semibold">{project.name}</h2>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button asChild variant="outline">
                            <Link href={`/projects/${projectId}/tasks`}>
                                Task Board <Route className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                </header>

                <div className="w-full max-w-lg flex-1">
                    <Card className="flex flex-col h-full">
                         <CardHeader>
                            <CardTitle>Project Plan</CardTitle>
                            <CardDescription>Add steps to your plan. A task will be automatically created on your board for each step.</CardDescription>
                             <div className="flex items-center gap-2 pt-2">
                                <Input
                                    placeholder="Add a new step to the plan..."
                                    value={newStepTitle}
                                    onChange={(e) => setNewStepTitle(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddStep(); }}
                                />
                                <Button onClick={handleAddStep}><Save className="mr-2 h-4 w-4" /> Save</Button>
                            </div>
                        </CardHeader>
                        <ScrollArea className="flex-1">
                            <CardContent className="space-y-2">
                                {steps.length > 0 ? (
                                    steps.map((step, index) => (
                                        <DraggableStep key={step.id || index} step={step} index={index} moveStep={moveStep}>
                                            <div className="flex items-center gap-2 p-2 rounded-md border bg-card group">
                                                <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                                                {editingStepId === step.id ? (
                                                    <Input autoFocus value={editingStepText} onChange={e => setEditingStepText(e.target.value)} onBlur={handleUpdateStepTitle} onKeyDown={e => e.key === 'Enter' && handleUpdateStepTitle()} className="h-7" />
                                                ) : (
                                                    <button onClick={() => handleOpenStepDetails(step)} className="text-sm flex-1 text-left truncate hover:underline">{step.title}</button>
                                                )}
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onSelect={() => handleOpenStepDetails(step)}><Pencil className="mr-2 h-4 w-4" /> Edit Details</DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => handleStartEditStep(step)}><Edit className="mr-2 h-4 w-4" /> Rename</DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onSelect={() => handleScheduleStep(step)}><CalendarIcon className="mr-2 h-4 w-4" /> Schedule to Calendar</DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => handleAddToTodoList(step)}><ListTodo className="mr-2 h-4 w-4" /> Add to To-Do List</DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => handleMakeProject(step)}><Briefcase className="mr-2 h-4 w-4" /> Convert to Project</DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => handleArchiveStep(step)}><Archive className="mr-2 h-4 w-4" /> Archive</DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onSelect={() => setStepToDelete(step)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete Step</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </DraggableStep>
                                    ))
                                ) : (
                                    <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                                        <p>No steps defined yet. Add one to start planning.</p>
                                    </div>
                                )}
                            </CardContent>
                        </ScrollArea>
                    </Card>
                </div>
            </div>
            
            <Dialog open={isStepDetailDialogOpen} onOpenChange={setIsStepDetailDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Step Details</DialogTitle>
                    </DialogHeader>
                     <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="step-title">Step Title</Label>
                            <Input id="step-title" value={stepToDetail?.title || ''} onChange={(e) => setStepToDetail(p => p ? {...p, title: e.target.value} : null)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="step-description">Description</Label>
                            <Textarea id="step-description" value={stepDetailDescription} onChange={(e) => setStepDetailDescription(e.target.value)} rows={8} placeholder="Add more details about this step..."/>
                        </div>
                    </div>
                    <DialogFooter className="justify-between">
                        <Button variant="destructive" onClick={() => { setStepToDelete(stepToDetail); setIsStepDetailDialogOpen(false); }}>
                            <Trash2 className="mr-2 h-4 w-4"/> Delete Step
                        </Button>
                        <div className="flex gap-2">
                          <Button variant="ghost" onClick={() => setIsStepDetailDialogOpen(false)}>Cancel</Button>
                          <Button onClick={handleSaveStepDetails}>Save</Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             <AlertDialog open={!!stepToDelete} onOpenChange={() => setStepToDelete(null)}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete the step "{stepToDelete?.title}" and its associated task from the board. This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteStep} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <NewTaskDialog
                isOpen={isNewProjectDialogOpen}
                onOpenChange={setIsNewProjectDialogOpen}
                onProjectCreate={handleProjectCreated}
                contacts={contacts}
                onContactsChange={setContacts}
                projectToEdit={null}
                initialData={initialDialogData}
            />
        </>
    );
}
