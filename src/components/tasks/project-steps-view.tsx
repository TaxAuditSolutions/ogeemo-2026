
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LoaderCircle, Plus, GripVertical, Trash2, ArrowLeft, ListChecks, Edit, MoreVertical, X, FolderPlus } from 'lucide-react';
import { TaskColumn } from './TaskColumn';
import { CreateTaskDialog } from './CreateTaskDialog';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogHeader,
  DialogFooter,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getProjectById, updateProject, getTasksForProject, addTask, updateTask, deleteTask, updateTaskPositions, getProjects, addProject } from '@/services/project-service';
import { type Project, type ProjectStep, type Event as TaskEvent, type TaskStatus } from '@/types/calendar-types';
import { DraggableStep, ItemTypes as StepItemTypes } from './DraggableStep';
import { ProjectManagementHeader } from '@/components/tasks/ProjectManagementHeader';
import { useDrop } from 'react-dnd';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { addMinutes } from 'date-fns';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '../ui/resizable';

export const ACTION_ITEMS_PROJECT_ID = 'inbox';


export default function ProjectStepsView({ projectId }: { projectId: string }) {
    const [project, setProject] = useState<Project | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [steps, setSteps] = useState<Partial<ProjectStep>[]>([]);
    const [tasks, setTasks] = useState<TaskEvent[]>([]);
    const [newStepTitle, setNewStepTitle] = useState('');
    const [editingStepId, setEditingStepId] = useState<string | null>(null);
    const [editingStepText, setEditingStepText] = useState('');
    const [stepToDelete, setStepToDelete] = useState<Partial<ProjectStep> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false);
    const [initialTaskData, setInitialTaskData] = useState<Partial<TaskEvent>>({});
    const [taskToEdit, setTaskToEdit] = useState<TaskEvent | null>(null);


    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const [isStepDetailDialogOpen, setIsStepDetailDialogOpen] = useState(false);
    const [stepToDetail, setStepToDetail] = useState<Partial<ProjectStep> | null>(null);
    const [stepDetailDescription, setStepDetailDescription] = useState("");
    
    const isActionItemsView = projectId === ACTION_ITEMS_PROJECT_ID;

    const loadData = useCallback(async () => {
        if (!user || !projectId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const [projectData, tasksData, allProjects] = await Promise.all([
                getProjectById(projectId),
                getTasksForProject(projectId),
                getProjects(user.uid),
            ]);

            if (!projectData) {
                toast({ variant: 'destructive', title: 'Error', description: 'Project not found.' });
                router.push('/projects/all');
                return;
            }
            setProject(projectData);
            setProjects(allProjects);
            setSteps(projectData.steps || []);
            setTasks(tasksData);
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
                await updateProject(project.id, { steps: updatedSteps });
            } catch (error) {
                console.error("Failed to save steps:", error);
                toast({ variant: "destructive", title: "Save failed", description: "Could not save the project plan." });
            }
        }
    }, [project, toast]);
    
    const handleAddStep = () => {
        if (newStepTitle.trim()) {
            const newStep: Partial<ProjectStep> = {
                id: `temp_${Date.now()}`,
                title: newStepTitle.trim(),
                isCompleted: false,
            };
            const newSteps = [...steps, newStep];
            setSteps(newSteps);
            setNewStepTitle('');
            handleSaveSteps(newSteps);
        }
    };
    
    const handleStartEditStep = (step: Partial<ProjectStep>) => {
        setEditingStepId(step.id || null);
        setEditingStepText(step.title || '');
    };

    const handleUpdateStepTitle = () => {
        if (!editingStepId) return;
        const updatedSteps = steps.map(s => s.id === editingStepId ? { ...s, title: editingStepText } : s);
        setSteps(updatedSteps);
        handleSaveSteps(updatedSteps);
        setEditingStepId(null);
        setEditingStepText('');
    };
    
    const handleOpenStepDetails = (step: Partial<ProjectStep>) => {
        setStepToDetail(step);
        setStepDetailDescription(step.description || '');
        setIsStepDetailDialogOpen(true);
    };
    
    const handleSaveStepDetails = () => {
        if (!stepToDetail) return;
        const updatedSteps = steps.map(s => s.id === stepToDetail.id ? { ...s, description: stepDetailDescription } : s);
        setSteps(updatedSteps);
        handleSaveSteps(updatedSteps);
        setIsStepDetailDialogOpen(false);
    };

    const handleDeleteStep = async () => {
        if (!stepToDelete) return;
        const updatedSteps = steps.filter(s => s.id !== stepToDelete.id);
        setSteps(updatedSteps);
        handleSaveSteps(updatedSteps);
        setStepToDelete(null);
        toast({ title: 'Step Deleted' });
    };

    const moveStep = useCallback(async (dragIndex: number, hoverIndex: number) => {
        const newSteps = [...steps];
        const [draggedItem] = newSteps.splice(dragIndex, 1);
        newSteps.splice(hoverIndex, 0, draggedItem);
        setSteps(newSteps);
        await handleSaveSteps(newSteps);
    }, [steps, handleSaveSteps]);

    const tasksByStatus = useMemo(() => {
        const sortedTasks = [...tasks].sort((a, b) => a.position - b.position);
        return {
            todo: sortedTasks.filter(t => t.status === 'todo'),
            inProgress: sortedTasks.filter(t => t.status === 'inProgress'),
            done: sortedTasks.filter(t => t.status === 'done'),
        };
    }, [tasks]);

    const handleAddTask = (initialData: Partial<TaskEvent> = {}) => {
        setTaskToEdit(null);
        setInitialTaskData(initialData);
        setIsNewTaskDialogOpen(true);
    };
    
    const handleEditTask = (task: TaskEvent) => {
        setTaskToEdit(task);
        setIsNewTaskDialogOpen(true);
    };

    const handleTaskSaved = () => {
        loadData();
        setIsNewTaskDialogOpen(false);
    };
    
    const handleDeleteTask = async (taskId: string) => {
        const originalTasks = [...tasks];
        setTasks(prev => prev.filter(t => t.id !== taskId));
        try {
            await deleteTask(taskId);
            toast({ title: "Task Deleted" });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the task.' });
            setTasks(originalTasks);
        }
    };
    
    const onDropTask = useCallback(async (item: TaskEvent | ProjectStep, newStatus: TaskStatus) => {
        if (!user || !projectId) return;

        if ('isCompleted' in item) { // Type guard for ProjectStep
            try {
                const newTaskData: Omit<TaskEvent, 'id'> = {
                    title: item.title || 'New Task from Plan',
                    description: item.description || '',
                    status: newStatus,
                    position: tasks.filter(t => t.status === newStatus).length,
                    projectId: projectId === 'inbox' ? null : projectId,
                    userId: user.uid,
                };
                const savedTask = await addTask(newTaskData);
                setTasks(prev => [...prev, savedTask]);
                toast({ title: 'Task Created', description: `New task "${savedTask.title}" was created from your plan.` });
            } catch (error: any) {
                 toast({ variant: 'destructive', title: 'Failed to create task', description: error.message });
            }
            return;
        }
        
        // It's a TaskEvent
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
    }, [user, projectId, toast, tasks]);

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

    const handleToggleComplete = async (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        const newStatus = task.status === 'done' ? 'todo' : 'done';
        onDropTask(task, newStatus);
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
                <header className="relative text-center mb-4 w-full max-w-7xl">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2">
                        <Button asChild variant="outline">
                            <Link href="/projects/all">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Project List
                            </Link>
                        </Button>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold font-headline text-primary">
                            Project Organizer
                        </h1>
                        <h2 className="text-xl text-muted-foreground">{project.name}</h2>
                    </div>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
                         <Button asChild variant="ghost" size="icon">
                            <Link href="/projects/all" aria-label="Close and return to project list">
                                <X className="h-5 w-5" />
                            </Link>
                        </Button>
                    </div>
                </header>
                
                 <div className="w-full max-w-7xl border-y py-2 mb-4">
                    <div className="flex justify-center items-center">
                        <ProjectManagementHeader />
                    </div>
                </div>
                
                <div className="flex-1 w-full max-w-7xl">
                    <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border">
                        {!isActionItemsView && (
                        <ResizablePanel defaultSize={30} minSize={25}>
                             <Card className="h-full flex flex-col border-0 rounded-none">
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle>Project Steps</CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1 space-y-2 overflow-y-auto">
                                    <div className="flex items-center gap-2 pt-2">
                                        <Input
                                            placeholder="Add a new project step..."
                                            value={newStepTitle}
                                            onChange={(e) => setNewStepTitle(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddStep(); }}
                                        />
                                        <Button onClick={handleAddStep} size="sm">
                                            <Plus className="mr-2 h-4 w-4" />
                                            Add
                                        </Button>
                                    </div>
                                    <div className="min-h-[200px] space-y-2 mt-4">
                                        {steps.length > 0 ? (
                                            steps.map((step, index) => (
                                                <DraggableStep key={step.id || index} step={step} index={index} moveStep={moveStep}>
                                                    <div className="flex items-center gap-2 p-2 rounded-md border bg-card group">
                                                        <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                                                        {editingStepId === step.id ? (
                                                            <Input
                                                                autoFocus
                                                                value={editingStepText}
                                                                onChange={(e) => setEditingStepText(e.target.value)}
                                                                onBlur={handleUpdateStepTitle}
                                                                onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateStepTitle(); if (e.key === 'Escape') setEditingStepId(null); }}
                                                                className="h-8 border-0 shadow-none focus-visible:ring-1 flex-1"
                                                                onClick={e => e.stopPropagation()}
                                                            />
                                                        ) : (
                                                            <button onClick={() => handleOpenStepDetails(step)} className="text-sm flex-1 text-left truncate hover:underline">
                                                                {step.title}
                                                            </button>
                                                        )}
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent>
                                                                <DropdownMenuItem onSelect={() => handleAddTask({ stepId: step.id })}>
                                                                <Plus className="mr-2 h-4 w-4" /> Add Task to this Step
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onSelect={() => handleStartEditStep(step)}><Edit className="mr-2 h-4 w-4" /> Rename</DropdownMenuItem>
                                                                <DropdownMenuItem onSelect={() => setStepToDelete(step)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
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
                                    </div>
                                </CardContent>
                            </Card>
                        </ResizablePanel>
                        )}
                        {!isActionItemsView && <ResizableHandle withHandle />}
                        <ResizablePanel defaultSize={isActionItemsView ? 100 : 70}>
                            <div className="h-full grid grid-cols-1 md:grid-cols-3 gap-6 p-4">
                                <TaskColumn 
                                    status="todo" 
                                    tasks={tasksByStatus.todo}
                                    onAddTask={() => handleAddTask({ status: 'todo' })}
                                    onDropTask={onDropTask} 
                                    onMoveCard={onMoveCard}
                                    onTaskDelete={handleDeleteTask}
                                    onToggleComplete={handleToggleComplete}
                                    onEdit={handleEditTask}
                                    onArchive={() => {}}
                                    selectedTaskIds={[]}
                                    onToggleSelect={() => {}}
                                    onToggleSelectAll={() => {}}
                                    onMakeProject={() => {}}
                                />
                                <TaskColumn 
                                    status="inProgress" 
                                    tasks={tasksByStatus.inProgress} 
                                    onDropTask={onDropTask} 
                                    onMoveCard={onMoveCard}
                                    onTaskDelete={handleDeleteTask}
                                    onToggleComplete={handleToggleComplete}
                                    onEdit={handleEditTask}
                                    onArchive={() => {}}
                                    selectedTaskIds={[]}
                                    onToggleSelect={() => {}}
                                    onToggleSelectAll={() => {}}
                                    onMakeProject={() => {}}
                                />
                                <TaskColumn 
                                    status="done" 
                                    tasks={tasksByStatus.done}
                                    onDropTask={onDropTask} 
                                    onMoveCard={onMoveCard}
                                    onTaskDelete={handleDeleteTask}
                                    onToggleComplete={handleToggleComplete}
                                    onEdit={handleEditTask}
                                    onArchive={() => {}}
                                    selectedTaskIds={[]}
                                    onToggleSelect={() => {}}
                                    onToggleSelectAll={() => {}}
                                    onMakeProject={() => {}}
                                />
                            </div>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </div>
            </div>

            <AlertDialog open={!!stepToDelete} onOpenChange={() => setStepToDelete(null)}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                    This will permanently delete the step "{stepToDelete?.title}". This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteStep} className="bg-destructive hover:bg-destructive/90">
                    Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <Dialog open={isStepDetailDialogOpen} onOpenChange={setIsStepDetailDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Step Details</DialogTitle>
                        <DialogDescription>{stepToDetail?.title}</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="step-description">Description</Label>
                        <Textarea
                            id="step-description"
                            value={stepDetailDescription}
                            onChange={(e) => setStepDetailDescription(e.target.value)}
                            rows={8}
                            placeholder="Add more details about this step..."
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsStepDetailDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveStepDetails}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                initialData={initialTaskData}
                projectId={projectId}
            />
        </>
    );
}
