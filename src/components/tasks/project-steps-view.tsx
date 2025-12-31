
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LoaderCircle, Plus, GripVertical, Trash2, ArrowLeft, ListChecks, Edit, MoreVertical, X } from 'lucide-react';
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
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getProjectById, updateProject } from '@/services/project-service';
import { type Project, type ProjectStep } from '@/types/calendar-types';
import { DraggableStep } from './DraggableStep';
import { ProjectManagementHeader } from './ProjectManagementHeader';

export default function ProjectStepsView() {
    const [project, setProject] = useState<Project | null>(null);
    const [steps, setSteps] = useState<Partial<ProjectStep>[]>([]);
    const [newStepTitle, setNewStepTitle] = useState('');
    const [editingStepId, setEditingStepId] = useState<string | null>(null);
    const [editingStepText, setEditingStepText] = useState('');
    const [stepToDelete, setStepToDelete] = useState<Partial<ProjectStep> | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const searchParams = useSearchParams();
    const projectId = searchParams.get('projectId');
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
            const projectData = await getProjectById(projectId);
            if (!projectData) {
                toast({ variant: 'destructive', title: 'Error', description: 'Project not found.' });
                router.push('/projects/all');
                return;
            }
            setProject(projectData);
            setSteps(projectData.steps || []);
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
        return (
            <div className="flex h-full w-full items-center justify-center p-4">
                <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!project) {
        return (
            <div className="text-center p-8">
                <p>Please select a project to view its plan.</p>
                <Button asChild variant="link">
                    <Link href="/projects/all">Go to Project List</Link>
                </Button>
            </div>
        );
    }
    
    return (
        <>
            <div className="p-4 sm:p-6 flex flex-col h-full items-center">
                <header className="relative text-center mb-6 w-full max-w-4xl">
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
                        <Button asChild>
                           <Link href={`/projects/${project.id}/tasks`}>
                                <ListChecks className="mr-2 h-4 w-4" /> Task Board
                            </Link>
                        </Button>
                         <Button asChild variant="ghost" size="icon">
                            <Link href="/projects/all" aria-label="Close and return to project list">
                                <X className="h-5 w-5" />
                            </Link>
                        </Button>
                    </div>
                </header>
                
                <div className="w-full max-w-2xl flex-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Project Steps</CardTitle>
                            <CardDescription>
                                Outline the major steps or phases of your project. Drag to reorder. These steps can be dragged onto your task board to create new tasks.
                            </CardDescription>
                             <div className="flex items-center gap-2 pt-2">
                                <Input
                                    placeholder="Add a new project step..."
                                    value={newStepTitle}
                                    onChange={(e) => setNewStepTitle(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddStep(); }}
                                />
                                <Button onClick={handleAddStep}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Step
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                             <div className="min-h-[300px] space-y-2">
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
                                                    <span className="text-sm flex-1 text-left truncate">{step.title}</span>
                                                )}
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuItem onSelect={() => handleStartEditStep(step)}><Edit className="mr-2 h-4 w-4" /> Rename</DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => setStepToDelete(step)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </DraggableStep>
                                    ))
                                ) : (
                                    <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                                        <p>No steps defined yet. Add one above to start planning.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
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
        </>
    );
}
