
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MoreVertical,
  Pencil,
  Trash2,
  Archive,
  LoaderCircle,
  Plus,
  Briefcase,
  Calendar as CalendarIcon,
  ListChecks,
  ListTodo,
  Route,
  ArrowLeft,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getProjects, getTasksForProject, addProject, updateTask, updateTaskPositions, deleteTask, getProjectById, type Project, type ProjectStep, type TaskStatus } from '@/services/project-service';
import { getContacts, type Contact } from '@/services/contact-service';
import { type Event as TaskEvent } from '@/types/calendar-types';
import { archiveTaskAsFile } from '@/services/file-service';
import { TaskColumn } from './TaskColumn';
import { NewTaskDialog } from './NewTaskDialog';
import { ProjectManagementHeader } from './ProjectManagementHeader';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../ui/resizable';
import { Input } from '../ui/input';
import { DraggableStep } from './DraggableStep';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { addMinutes } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
    const [tasks, setTasks] = useState<TaskEvent[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false);
    const [initialDialogData, setInitialDialogData] = useState<Partial<TaskEvent>>({});
    const [taskToEdit, setTaskToEdit] = useState<TaskEvent | null>(null);
    const [taskToDelete, setTaskToDelete] = useState<TaskEvent | null>(null);
    
    // States from former ProjectStepsView
    const [steps, setSteps] = useState<Partial<ProjectStep>[]>([]);
    const [editingStepId, setEditingStepId] = useState<string | null>(null);
    const [editingStepText, setEditingStepText] = useState('');
    const [stepToDelete, setStepToDelete] = useState<Partial<ProjectStep> | null>(null);
    const [isStepDetailDialogOpen, setIsStepDetailDialogOpen] = useState(false);
    const [stepToDetail, setStepToDetail] = useState<Partial<ProjectStep> | null>(null);
    const [stepDetailDescription, setStepDetailDescription] = useState("");

    const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
    const [taskToConvert, setTaskToConvert] = useState<TaskEvent | null>(null);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
    const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);

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
            const allProjects = await getProjects(user.uid);
            setProjects(allProjects);
            
            if (isActionItemsView) {
                projectData = {
                    id: ACTION_ITEMS_PROJECT_ID,
                    name: "Action Items",
                    description: "A place for all your unscheduled tasks and ideas.",
                    userId: user.uid,
                    createdAt: new Date(0),
                };
                const allUserTasks = await getTasksForProject(projectId);
                tasksData = allUserTasks.filter(task => !task.ritualType);
            } else {
                [projectData, tasksData] = await Promise.all([
                    getProjectById(projectId),
                    getTasksForProject(projectId),
                ]);
                tasksData = tasksData.filter(task => !task.ritualType);
            }
            
            if (!projectData) {
                toast({ variant: 'destructive', title: 'Error', description: 'Project not found.' });
                router.push('/projects/all');
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

    const onDropTask = useCallback(async (item: TaskEvent | Partial<ProjectStep>, newStatus: TaskStatus) => {
        if (!user || !project) return;
        
        // Handle dropping a step from the planner
        if (!('status' in item)) { 
            try {
                const newTaskData: Omit<TaskEvent, 'id'> = {
                    title: item.title || "New Task from Plan",
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

        // Handle dropping an existing task
        if (item.status === newStatus) return;

        const originalTasks = [...tasks];
        const updatedTasks = tasks.map(t => 
            t.id === item.id ? { ...t, status: newStatus } : t
        );
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
    
    const handleAddTask = (initialData: Partial<TaskEvent> = {}) => {
        setTaskToEdit(null);
        setInitialDialogData(initialData);
        setIsNewTaskDialogOpen(true);
    };

    const handleTaskSaved = () => {
        loadData();
        setIsNewTaskDialogOpen(false);
    };
    
    const handleEditTask = (task: TaskEvent) => {
        setTaskToEdit(task);
        setIsNewTaskDialogOpen(true);
    };

    const handleDeleteTask = (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (task) setTaskToDelete(task);
    };
    
    const handleConfirmDelete = async () => {
        if (!taskToDelete) return;
        try {
            await deleteTask(taskToDelete.id);
            // The task's step is now deleted via the service
            toast({ title: 'Task Deleted' });
            loadData();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the task.' });
        } finally {
            setTaskToDelete(null);
        }
    };


    const handleToggleComplete = async (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        const newStatus = task.status === 'done' ? 'todo' : 'done';
        onDropTask(task, newStatus);
    };
    
    const handleSaveSteps = useCallback(async (updatedSteps: Partial<ProjectStep>[]) => {
        if (project && !isActionItemsView) {
            try {
                const stepsToSave = updatedSteps.map(step => ({
                    ...step,
                    id: step.id && !step.id.startsWith('temp_') ? step.id : `step_${Date.now()}_${Math.random()}`
                }));
                setSteps(stepsToSave);
                await updateProject(project.id, { steps: stepsToSave });
                return stepsToSave;
            } catch (error) {
                console.error("Failed to save steps:", error);
                toast({ variant: "destructive", title: "Save failed", description: "Could not save the project plan." });
                return null;
            }
        }
        return null;
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
        await handleSaveSteps(updatedSteps);

        // Also update the corresponding task
        const correspondingTask = tasks.find(t => t.stepId === stepToDetail.id);
        if (correspondingTask) {
            try {
                await updateTask(correspondingTask.id, { title: stepToDetail.title, description: stepDetailDescription });
                setTasks(prev => prev.map(t => t.id === correspondingTask.id ? {...t, title: stepToDetail.title!, description: stepDetailDescription} : t));
            } catch (error) {
                toast({ variant: 'destructive', title: 'Task Sync Failed', description: 'Could not update the associated task.' });
            }
        }

        setIsStepDetailDialogOpen(false);
    };

    const handleDeleteStep = async () => {
        if (!stepToDelete || !user) return;
        try {
            await deleteTask(stepToDelete.id); // This now handles the step deletion
            toast({ title: 'Step Deleted' });
            loadData(); // Reload all data for consistency
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not delete the step and associated task.' });
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
              await deleteTask(taskToConvert.id);
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
            await archiveTaskAsFile(user.uid, task);
            await deleteTask(task.id);
            loadData();
            toast({ title: 'Archived', description: 'Task saved to File Manager.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Archive Failed', description: error.message });
        }
    };
    
    const handleAddToTodoList = async (task: TaskEvent) => {
        if (!user || !project) return;
        try {
            const newTaskData: Omit<TaskEvent, 'id'> = {
                title: `[${project.name}]: ${task.title}`,
                status: 'todo',
                position: 0,
                userId: user.uid,
                isTodoItem: true,
                projectId: null,
            };
            await addTask(newTaskData);
            toast({ title: "Added to To-Do List", description: `A new entry for "${task.title}" has been created.`});
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to add to To-Do List', description: error.message });
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
        const columnTasks = tasksByStatus[status];
        const columnTaskIds = columnTasks.map(t => t.id);
        const selectedInColumn = selectedTaskIds.filter(id => columnTaskIds.includes(id));

        if (selectedInColumn.length === columnTasks.length) {
          setSelectedTaskIds(prev => prev.filter(id => !columnTaskIds.includes(id)));
        } else {
          setSelectedTaskIds(prev => [...new Set([...prev, ...columnTaskIds])]);
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
                    onArchive={handleArchive}
                    onMakeProject={handleMakeProject}
                    onAddToTodoList={handleAddToTodoList}
                    selectedTaskIds={selectedTaskIds}
                    onToggleSelect={handleToggleSelect}
                    onToggleSelectAll={handleToggleSelectAll}
                />
                 <TaskColumn 
                    status="inProgress" 
                    tasks={tasksByStatus.inProgress}
                    onDropTask={onDropTask} 
                    onMoveCard={onMoveCard}
                    onTaskDelete={handleDeleteTask}
                    onToggleComplete={handleToggleComplete}
                    onEdit={handleEditTask}
                    onArchive={handleArchive}
                    selectedTaskIds={selectedTaskIds}
                    onToggleSelect={handleToggleSelect}
                    onToggleSelectAll={handleToggleSelectAll}
                    onMakeProject={handleMakeProject}
                    onAddToTodoList={handleAddToTodoList}
                />
                 <TaskColumn 
                    status="done" 
                    tasks={tasksByStatus.done}
                    onDropTask={onDropTask} 
                    onMoveCard={onMoveCard}
                    onTaskDelete={handleDeleteTask}
                    onToggleComplete={handleToggleComplete}
                    onEdit={handleEditTask}
                    onArchive={handleArchive}
                    selectedTaskIds={selectedTaskIds}
                    onToggleSelect={handleToggleSelect}
                    onToggleSelectAll={handleToggleSelectAll}
                    onMakeProject={handleMakeProject}
                    onAddToTodoList={handleAddToTodoList}
                />
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
                projects={projects}
                initialData={initialDialogData}
                projectId={projectId}
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
            
            <AlertDialog open={!!stepToDelete} onOpenChange={() => setStepToDelete(null)}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete the step "{stepToDelete?.title}" and its associated task from the board. This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteStep} className="bg-destructive hover:bg-destructive/90">
                    Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

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
        </>
    );
}

