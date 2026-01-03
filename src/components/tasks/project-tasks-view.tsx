
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LoaderCircle, Plus, GripVertical, Trash2, ArrowLeft, X, Edit, MoreVertical, BookOpen, Save } from 'lucide-react';
import { TaskColumn } from './TaskColumn';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getProjectById, getTasksForProject, addTask, updateTask, updateTaskPositions, deleteTask, updateProject, getProjects } from '@/services/project-service';
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
import { ProjectManagementHeader } from '@/components/tasks/ProjectManagementHeader';
import { CreateTaskDialog } from './CreateTaskDialog';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../ui/resizable';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Input } from '../ui/input';
import { DraggableStep } from './DraggableStep';
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
} from '@/components/ui/dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { getContacts, type Contact } from '@/services/contact-service';
import { NewTaskDialog } from './NewTaskDialog';


export const ACTION_ITEMS_PROJECT_ID = 'inbox';

export function ProjectTasksView({ projectId }: { projectId: string }) {
    const [project, setProject] = useState<Project | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [steps, setSteps] = useState<Partial<ProjectStep>[]>([]);
    const [tasks, setTasks] = useState<TaskEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
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

    const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
    const [taskToConvert, setTaskToConvert] = useState<TaskEvent | null>(null);
    const [contacts, setContacts] = useState<Contact[]>([]);

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
            let allProjects: Project[] = [];
            let allContacts: Contact[] = [];
            
            if (isActionItemsView) {
                projectData = {
                    id: ACTION_ITEMS_PROJECT_ID,
                    name: "Action Items",
                    description: "A place for all your unscheduled tasks and ideas.",
                    userId: user.uid,
                    createdAt: new Date(0),
                };
                const allUserTasks = await getTasksForUser(user.uid);
                tasksData = allUserTasks.filter(task => (!task.projectId || task.projectId === ACTION_ITEMS_PROJECT_ID) && !task.ritualType);
                allProjects = await getProjects(user.uid);
            } else {
                [projectData, tasksData, allProjects, allContacts] = await Promise.all([
                    getProjectById(projectId),
                    getTasksForProject(projectId),
                    getProjects(user.uid),
                    getContacts(user.uid),
                ]);
                tasksData = tasksData.filter(task => !task.ritualType);
            }
            
            if (!projectData) {
                toast({ variant: 'destructive', title: 'Error', description: 'Project not found.' });
                router.push('/projects/all');
                return;
            }

            setProject(projectData);
            setProjects(allProjects);
            setSteps(projectData.steps || []);
            setTasks(tasksData);
            setContacts(allContacts);
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

    const handleTaskSaved = () => {
        loadData(); // Refresh data after save/update
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
    
    const onDropTask = useCallback(async (item: TaskEvent | Partial<ProjectStep>, newStatus: TaskStatus) => {
        if (!user || !project) return;
        
        if (!('status' in item)) { // Type guard for ProjectStep
            try {
                const newTaskData: Omit<TaskEvent, 'id'> = {
                    title: item.title || 'New Task from Plan',
                    description: item.description || '',
                    status: newStatus,
                    position: tasks.filter(t => t.status === newStatus).length,
                    projectId: projectId === 'inbox' ? null : projectId,
                    stepId: item.id,
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
    }, [user, project, projectId, toast, tasks]);

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

    
    if (isLoading) {
        return <div className="flex h-full w-full items-center justify-center"><LoaderCircle className="h-10 w-10 animate-spin text-primary" /></div>;
    }
    
    if (!project) return null;

    return (
        <>
            <div className="p-4 sm:p-6 h-full flex flex-col items-center">
                 <header className="text-center mb-6">
                    <h1 className="text-3xl font-bold font-headline text-primary">
                        {project.name}
                    </h1>
                    <p className="text-muted-foreground">
                        {project.description || (isActionItemsView ? "A place for all your unscheduled tasks and ideas." : "Drag and drop tasks to change their status.")}
                    </p>
                </header>
                <ProjectManagementHeader projectId={projectId} />
                
                <div className="w-full max-w-7xl flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
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
                initialData={initialTaskData}
                projectId={projectId}
            />

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
                        <Textarea id="step-description" value={stepDetailDescription} onChange={(e) => setStepDetailDescription(e.target.value)} rows={8} placeholder="Add more details about this step..."/>
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
