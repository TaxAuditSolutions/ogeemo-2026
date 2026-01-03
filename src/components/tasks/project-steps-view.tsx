
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LoaderCircle, Plus, GripVertical, Trash2, ArrowLeft, Edit, MoreVertical, BookOpen, Save } from 'lucide-react';
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
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogHeader, DialogFooter, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getProjectById, updateProject, addTask, type Project, type ProjectStep, type ProjectTemplate, addProjectTemplate, getProjectTemplates } from '@/services/project-service';
import { DraggableStep } from './DraggableStep';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { type Event as TaskEvent } from '@/types/calendar';

export default function ProjectStepsView({ projectId }: { projectId: string }) {
    const [project, setProject] = useState<Project | null>(null);
    const [steps, setSteps] = useState<Partial<ProjectStep>[]>([]);
    const [newStepTitle, setNewStepTitle] = useState('');
    const [editingStepId, setEditingStepId] = useState<string | null>(null);
    const [editingStepText, setEditingStepText] = useState('');
    const [stepToDelete, setStepToDelete] = useState<Partial<ProjectStep> | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [isStepDetailDialogOpen, setIsStepDetailDialogOpen] = useState(false);
    const [stepToDetail, setStepToDetail] = useState<Partial<ProjectStep> | null>(null);
    const [stepDetailDescription, setStepDetailDescription] = useState("");

    const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
    const [isSaveTemplateDialogOpen, setIsSaveTemplateDialogOpen] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');

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
            const [projectData, fetchedTemplates] = await Promise.all([
                getProjectById(projectId),
                getProjectTemplates(user.uid),
            ]);

            if (!projectData) {
                toast({ variant: 'destructive', title: 'Error', description: 'Project not found.' });
                router.push('/projects/all');
                return;
            }
            setProject(projectData);
            setSteps(projectData.steps || []);
            setTemplates(fetchedTemplates);
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

    const handleCreateTaskFromStep = async (step: Partial<ProjectStep>) => {
        if (!user || !project) return;
        try {
            const newTaskData: Omit<TaskEvent, 'id'> = {
                title: step.title || "New Task",
                description: step.description || '',
                status: 'todo',
                position: 0,
                projectId: project.id,
                stepId: step.id,
                userId: user.uid,
            };
            await addTask(newTaskData);
            toast({
                title: "Task Created",
                description: `A task for "${step.title}" has been added to the project board.`,
                action: <Button asChild variant="link"><a onClick={() => router.push(`/projects/${project.id}/tasks`)}>View Board</a></Button>
            });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Task Creation Failed', description: error.message });
        }
    };

    const handleSaveTemplate = async () => {
      if (!user || !newTemplateName.trim() || !project) {
        toast({ variant: 'destructive', title: 'Template name is required.' });
        return;
      }
      try {
        const newTemplate = await addProjectTemplate({
          name: newTemplateName,
          description: project.description || '',
          steps: steps.map(({ id, ...step }) => step), // Remove temporary IDs
          userId: user.uid,
        });
        setTemplates(prev => [...prev, newTemplate]);
        toast({ title: 'Template Saved', description: `"${newTemplateName}" is now available for future projects.` });
        setIsSaveTemplateDialogOpen(false);
        setNewTemplateName('');
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Failed to save template', description: error.message });
      }
    };

    const handleLoadTemplate = (templateId: string) => {
        const template = templates.find(t => t.id === templateId);
        if (template) {
            const newSteps = template.steps.map(step => ({
                id: `temp_${Date.now()}_${Math.random()}`,
                ...step
            }));
            setSteps(newSteps);
            handleSaveSteps(newSteps);
            toast({ title: 'Template Loaded', description: `Steps from "${template.name}" have been applied.` });
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
                <header className="relative text-center mb-6 w-full max-w-4xl">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <Button asChild variant="outline">
                            <Link href="/to-do">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Task List
                            </Link>
                        </Button>
                         <Button asChild variant="outline">
                            <Link href={`/projects/${projectId}/tasks`}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Task Board
                            </Link>
                        </Button>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold font-headline text-primary">
                            Project Planner
                        </h1>
                        <h2 className="text-xl text-muted-foreground">{project.name}</h2>
                    </div>
                </header>

                <Card className="w-full max-w-4xl flex-1 flex flex-col">
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <CardTitle>Master Plan</CardTitle>
                                <CardDescription>Define all the steps required to complete this project.</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Select onValueChange={handleLoadTemplate}>
                                <SelectTrigger className="w-48 h-9 text-xs">
                                    <SelectValue placeholder="Load Template..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                </SelectContent>
                                </Select>
                                <Button size="sm" className="h-9" onClick={() => { setNewTemplateName(project.name); setIsSaveTemplateDialogOpen(true); }}>
                                <Save className="mr-2 h-4 w-4"/> Save as Template
                                </Button>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 pt-4">
                            <Input
                                placeholder="Add a new step to the plan..."
                                value={newStepTitle}
                                onChange={(e) => setNewStepTitle(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleAddStep(); }}
                            />
                            <Button onClick={handleAddStep}>
                                <Plus className="mr-2 h-4 w-4" /> Add Step
                            </Button>
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
                                                <Input autoFocus value={editingStepText} onChange={(e) => setEditingStepText(e.target.value)} onBlur={handleUpdateStepTitle} onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateStepTitle(); if (e.key === 'Escape') setEditingStepId(null); }} className="h-8 border-0 shadow-none focus-visible:ring-1 flex-1" onClick={e => e.stopPropagation()} />
                                            ) : (
                                                <button onClick={() => handleOpenStepDetails(step)} className="text-sm flex-1 text-left truncate hover:underline">{step.title}</button>
                                            )}
                                             <Button variant="secondary" size="sm" className="h-7 px-2" onClick={() => handleCreateTaskFromStep(step)}>
                                                <Plus className="mr-1 h-4 w-4"/> Create Task
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onSelect={() => handleStartEditStep(step)}><Edit className="mr-2 h-4 w-4" /> Rename Step</DropdownMenuItem>
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
            
             <AlertDialog open={!!stepToDelete} onOpenChange={() => setStepToDelete(null)}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete the step "{stepToDelete?.title}". This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteStep} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
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

            <Dialog open={isSaveTemplateDialogOpen} onOpenChange={setIsSaveTemplateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save as Template</DialogTitle>
                        <DialogDescription>Save the current list of steps as a reusable template for future projects.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="template-name">Template Name</Label>
                        <Input id="template-name" value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveTemplate()}/>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsSaveTemplateDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveTemplate}>Save Template</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
