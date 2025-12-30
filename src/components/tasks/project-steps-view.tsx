
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoaderCircle, ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getProjectById, updateProject, getTasksForProject, addTask, updateTaskPositions, deleteTask, updateTask } from '@/services/project-service';
import { type Project, type Event as TaskEvent, type TaskStatus, type ProjectStep } from '@/types/calendar-types';
import { TaskColumn } from './TaskColumn';
import { CreateTaskDialog } from './CreateTaskDialog';
import { getContacts, type Contact } from '@/services/contact-service';

export default function ProjectStepsView() {
    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<TaskEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [taskToEdit, setTaskToEdit] = useState<TaskEvent | null>(null);
    const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false);
    
    const router = useRouter();
    const searchParams = useSearchParams();
    const projectId = searchParams.get('projectId');
    const { user } = useAuth();
    const { toast } = useToast();

    const loadData = useCallback(async () => {
        if (!user || !projectId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const [projectData, tasksData] = await Promise.all([
                getProjectById(projectId),
                getTasksForProject(projectId),
            ]);
            
            if (!projectData) {
                toast({ variant: 'destructive', title: 'Error', description: 'Project not found.' });
                router.push('/projects');
                return;
            }

            setProject(projectData);
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

    const tasksByStatus = useMemo(() => {
        const sortedTasks = [...tasks].sort((a, b) => a.position - b.position);
        return {
            todo: sortedTasks.filter(t => t.status === 'todo'),
            inProgress: sortedTasks.filter(t => t.status === 'inProgress'),
            done: sortedTasks.filter(t => t.status === 'done'),
        };
    }, [tasks]);

    const handleDropTask = useCallback(async (item: TaskEvent | ProjectStep, newStatus: TaskStatus) => {
        // This view only handles moving existing tasks, not creating from steps.
        if ('isCompleted' in item) return;

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
    }, [tasks, toast]);
    
    const handleMoveCard = useCallback(async (dragId: string, hoverId: string) => {
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

    const handleTaskSaved = () => {
        loadData();
        setIsNewTaskDialogOpen(false);
    };

    if (isLoading) {
        return <div className="flex h-full w-full items-center justify-center"><LoaderCircle className="h-10 w-10 animate-spin" /></div>;
    }

    if (!project) {
        return <div className="p-8 text-center">Project could not be loaded.</div>;
    }

    return (
        <>
            <div className="p-4 sm:p-6 space-y-6 h-full flex flex-col items-center">
                <header className="flex justify-between items-center w-full max-w-7xl">
                    <Button variant="outline" onClick={() => router.push(`/projects/${project.id}/timeline`)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Timeline
                    </Button>
                    <div className="text-center">
                        <h1 className="text-3xl font-bold font-headline text-primary">Project Organizer</h1>
                        <p className="text-muted-foreground">{project.name}</p>
                    </div>
                     <Button onClick={() => { setTaskToEdit(null); setIsNewTaskDialogOpen(true); }}>
                        <Plus className="mr-2 h-4 w-4" /> Add Task
                    </Button>
                </header>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-7xl mt-6">
                    <TaskColumn 
                        status="todo" 
                        tasks={tasksByStatus.todo}
                        onDropTask={handleDropTask}
                        onMoveCard={handleMoveCard}
                        onEdit={(task) => { setTaskToEdit(task); setIsNewTaskDialogOpen(true); }}
                        onTaskDelete={() => {}}
                        onToggleComplete={() => {}}
                        onArchive={() => {}}
                        selectedTaskIds={[]}
                        onToggleSelect={() => {}}
                        onToggleSelectAll={() => {}}
                        onMakeProject={() => {}}
                    />
                    <TaskColumn 
                        status="inProgress" 
                        tasks={tasksByStatus.inProgress}
                        onDropTask={handleDropTask}
                        onMoveCard={handleMoveCard}
                        onEdit={(task) => { setTaskToEdit(task); setIsNewTaskDialogOpen(true); }}
                        onTaskDelete={() => {}}
                        onToggleComplete={() => {}}
                        onArchive={() => {}}
                        selectedTaskIds={[]}
                        onToggleSelect={() => {}}
                        onToggleSelectAll={() => {}}
                        onMakeProject={() => {}}
                    />
                    <TaskColumn 
                        status="done" 
                        tasks={tasksByStatus.done}
                        onDropTask={handleDropTask}
                        onMoveCard={handleMoveCard}
                        onEdit={(task) => { setTaskToEdit(task); setIsNewTaskDialogOpen(true); }}
                        onTaskDelete={() => {}}
                        onToggleComplete={() => {}}
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
                onOpenChange={(open) => { setIsNewTaskDialogOpen(open); if (!open) setTaskToEdit(null); }}
                onTaskCreate={handleTaskSaved}
                onTaskUpdate={handleTaskSaved}
                taskToEdit={taskToEdit}
                projectId={projectId || undefined}
                projects={[]} // Not needed in this context
            />
        </>
    );
}
