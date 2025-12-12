

'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, Plus, GripVertical, Trash2, ArrowLeft, X, Edit, MoreVertical } from 'lucide-react';
import { TaskColumn } from './TaskColumn';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getProjectById, getTasksForProject, addTask, updateTask, updateTaskPositions, deleteTask, deleteTasks, updateProject } from '@/services/project-service';
import { type Project, type Event as TaskEvent, type TaskStatus, type ProjectStep } from '@/types/calendar';
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
import { ProjectManagementHeader } from './ProjectManagementHeader';
import { NewTaskDialog } from './NewTaskDialog';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../ui/resizable';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { DraggableStep, ItemTypes as StepItemTypes } from './DraggableStep';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { addMinutes } from 'date-fns';
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
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';


export const ACTION_ITEMS_PROJECT_ID = 'inbox';

export function ProjectTasksView({ projectId }: { projectId: string }) {
    const [project, setProject] = useState<Project | null>(null);
    const [steps, setSteps] = useState<Partial<ProjectStep>[]>([]);
    const [newStepTitle, setNewStepTitle] = useState("");
    const [tasks, setTasks] = useState<TaskEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
    const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false);
    const [initialTaskData, setInitialTaskData] = useState<Partial<TaskEvent>>({});
    const [taskToEdit, setTaskToEdit] = useState<TaskEvent | null>(null);

    const [editingStepId, setEditingStepId] = useState<string | null>(null);
    const [editingStepText, setEditingStepText] = useState('');
    const [stepToDelete, setStepToDelete] = useState<Partial<ProjectStep> | null>(null);
    
    // State for the new "Edit Step Details" dialog
    const [isStepDetailDialogOpen, setIsStepDetailDialogOpen] = useState(false);
    const [stepToDetail, setStepToDetail] = useState<Partial<ProjectStep> | null>(null);
    const [stepDetailDescription, setStepDetailDescription] = useState("");


    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const isActionItemsView = projectId === ACTION_ITEMS_PROJECT_ID;

    const loadData = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            let projectData: Project | null;
            let tasksData: TaskEvent[];
            
            if (isActionItemsView) {
                projectData = {
                    id: ACTION_ITEMS_PROJECT_ID,
                    name: "To Do",
                    description: "A place for all your unscheduled tasks.",
                    userId: user.uid,
                    createdAt: new Date(0),
                };
                const allUserTasks = await getTasksForUser(user.uid);
                tasksData = allUserTasks.filter(task => (!task.projectId || task.projectId === ACTION_ITEMS_PROJECT_ID) && !task.ritualType);
            } else {
                [projectData, tasksData] = await Promise.all([
                    getProjectById(projectId),
                    getTasksForProject(projectId),
                ]);
                tasksData = tasksData.filter(task => !task.ritualType);
            }
            
            if (!projectData) {
                toast({ variant: 'destructive', title: 'Error', description: 'Project not found.' });
                router.push('/projects');
                return;
            }

            setProject(projectData);
            setSteps(projectData.steps || []);
            setTasks(tasksData);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to load project data', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [projectId, isActionItemsView, user, router, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
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

    const handleTaskCreated = (newTask: TaskEvent) => {
        setTasks(prev => [newTask, ...prev]);
        setIsNewTaskDialogOpen(false);
    };

    const handleTaskUpdated = (updatedTask: TaskEvent) => {
        setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
        setIsNewTaskDialogOpen(false);
    };

    const handleTaskDeleted = async (taskId: string) => {
        const originalTasks = [...tasks];
        setTasks(prev => prev.filter(t => t.id !== taskId));
        try {
            await deleteTask(taskId);
            toast({ title: "Task Deleted" });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
            setTasks(originalTasks);
        }
    };
    
    const handleMoveTask = useCallback(async (item: TaskEvent | ProjectStep, newStatus: TaskStatus, newPosition: number) => {
        if (!user) return;
    
        if ('isCompleted' in item) { // Type guard for ProjectStep
            try {
                const newTaskData: Omit<TaskEvent, 'id'> = {
                    title: item.title || 'New Task from Plan',
                    description: item.description || '',
                    status: newStatus,
                    position: newPosition,
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

        const taskId = item.id;
        const taskToMove = tasks.find(t => t.id === taskId);
        if (!taskToMove) return;

        const originalTasks = [...tasks];
        
        const tasksInNewColumn = tasks.filter(t => t.status === newStatus && t.id !== taskId);
        tasksInNewColumn.splice(newPosition, 0, { ...taskToMove, status: newStatus });
        
        const otherTasks = tasks.filter(t => t.status !== newStatus && t.id !== taskId);
        
        const updatedTasks = [...otherTasks, ...tasksInNewColumn].map((t, index) => ({ ...t, position: index }));

        const tasksToUpdateInDb = tasksInNewColumn.map((task, index) => ({
            id: task.id,
            position: index,
            status: newStatus,
        }));

        setTasks(updatedTasks);
        
        try {
            await updateTaskPositions(tasksToUpdateInDb);
        } catch (error: any) {
            setTasks(originalTasks);
            toast({ variant: 'destructive', title: 'Failed to move task', description: error.message });
        }
    }, [tasks, user, projectId, toast]);

    const handleSaveSteps = useCallback(async (updatedSteps: Partial<ProjectStep>[]) => {
        if (project && !isActionItemsView) {
            try {
                await updateProject(project.id, { steps: updatedSteps });
            } catch (error) {
                console.error("Failed to save steps:", error);
                toast({ variant: "destructive", title: "Save failed", description: "Could not save the project plan." });
            }
        }
    }, [project, isActionItemsView, toast]);

    const handleAddStep = () => {
        if (!newStepTitle.trim()) return;
        const newStep: Partial<ProjectStep> = {
            id: `temp_${Date.now()}`,
            title: newStepTitle,
            isCompleted: false,
        };
        const updatedSteps = [...steps, newStep];
        setSteps(updatedSteps);
        setNewStepTitle("");
        handleSaveSteps(updatedSteps);
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

    const handleToggleComplete = async (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const newStatus = task.status === 'done' ? 'todo' : 'done';
        const updatedTask = { ...task, status: newStatus };

        setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));

        try {
            await updateTask(taskId, { status: newStatus });
            toast({ title: `Task ${newStatus === 'done' ? 'completed' : 'reopened'}` });
        } catch (error: any) {
            setTasks(prev => prev.map(t => t.id === taskId ? task : t));
            toast({ variant: 'destructive', title: 'Failed to update task status' });
        }
    };
    
    if (isLoading) {
        return <div className="flex h-full w-full items-center justify-center"><LoaderCircle className="h-10 w-10 animate-spin text-primary" /></div>;
    }
    
    if (!project) return null;

    return (
        <>
            <div className="p-4 sm:p-6 h-full flex flex-col">
                 <header className="text-center mb-6 relative">
                    <h1 className="text-3xl font-bold font-headline text-primary">{project.name}</h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto">{project.description}</p>
                    <div className="absolute top-0 right-0">
                        <Button variant="ghost" size="icon" onClick={() => router.back()}>
                            <X className="h-5 w-5" />
                            <span className="sr-only">Close</span>
                        </Button>
                    </div>
                </header>
                <ProjectManagementHeader projectId={projectId} />
                
                <ResizablePanelGroup direction="horizontal" className="flex-1 rounded-lg border">
                    <ResizablePanel defaultSize={30} minSize={25}>
                        <Card className="h-full flex flex-col border-0 rounded-none">
                            <CardHeader>
                                <CardTitle>Project Plan</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 space-y-2 overflow-y-auto">
                                {steps.map((step, index) => (
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
                                                      <Plus className="mr-2 h-4 w-4" /> Add Task
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => handleStartEditStep(step)}><Edit className="mr-2 h-4 w-4" /> Rename</DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => setStepToDelete(step)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </DraggableStep>
                                ))}
                            </CardContent>
                             <div className="p-2 border-t">
                                <div className="flex items-center gap-2">
                                     <Input
                                        placeholder="Add a new step..."
                                        value={newStepTitle}
                                        onChange={(e) => setNewStepTitle(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddStep(); }}
                                    />
                                    <Button size="sm" onClick={handleAddStep}>
                                        <Plus className="mr-2 h-4 w-4" /> Add
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={70}>
                        <div className="h-full grid grid-cols-1 md:grid-cols-3 gap-6 p-4">
                            <TaskColumn status="todo" tasks={tasksByStatus.todo} onAddTask={() => handleAddTask()} onMoveTask={handleMoveTask} onTaskUpdate={handleTaskUpdated} onTaskDelete={handleTaskDeleted} onToggleComplete={handleToggleComplete} onEdit={handleEditTask} selectedTaskIds={[]} onToggleSelect={()=>{}} onToggleSelectAll={()=>{}} />
                            <TaskColumn status="inProgress" tasks={tasksByStatus.inProgress} onAddTask={() => handleAddTask()} onMoveTask={handleMoveTask} onTaskUpdate={handleTaskUpdated} onTaskDelete={handleTaskDeleted} onToggleComplete={handleToggleComplete} onEdit={handleEditTask} selectedTaskIds={[]} onToggleSelect={()=>{}} onToggleSelectAll={()=>{}} />
                            <TaskColumn status="done" tasks={tasksByStatus.done} onAddTask={() => handleAddTask()} onMoveTask={handleMoveTask} onTaskUpdate={handleTaskUpdated} onTaskDelete={handleTaskDeleted} onToggleComplete={handleToggleComplete} onEdit={handleEditTask} selectedTaskIds={[]} onToggleSelect={()=>{}} onToggleSelectAll={()=>{}} />
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
            
            <NewTaskDialog isOpen={isNewTaskDialogOpen} onOpenChange={setIsNewTaskDialogOpen} onTaskCreate={handleTaskCreated} onTaskUpdate={handleTaskUpdated} projectId={projectId} taskToEdit={taskToEdit} initialData={initialTaskData} />

            <AlertDialog open={!!stepToDelete} onOpenChange={() => setStepToDelete(null)}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                    This will permanently delete the step "{stepToDelete?.title}". This cannot be undone.
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
        </>
    );
}

    