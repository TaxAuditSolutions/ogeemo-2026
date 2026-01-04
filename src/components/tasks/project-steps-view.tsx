
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
import { getProjectById, updateProject, addTask, type Project, type ProjectStep, type ProjectTemplate, addProjectTemplate, getProjectTemplates, updateProjectTemplate, deleteProjectTemplate } from '@/services/project-service';
import { DraggableStep } from './DraggableStep';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { type Event as TaskEvent } from '@/types/calendar-types';
import { addMinutes } from 'date-fns';

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
    const [stepDetailTitle, setStepDetailTitle] = useState("");
    const [stepDetailDescription, setStepDetailDescription] = useState("");

    const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
    const [templateToEdit, setTemplateToEdit] = useState<ProjectTemplate | null>(null);
    const [isManageTemplatesOpen, setIsManageTemplatesOpen] = useState(false);
    const [isSaveTemplateDialogOpen, setIsSaveTemplateDialogOpen] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');
    const [templateToDelete, setTemplateToDelete] = useState<ProjectTemplate | null>(null);

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
    
    const handleAddStep = async () => {
        if (!newStepTitle.trim() || !user || !project) {
            setNewStepTitle('');
            return;
        }

        const newStep: Partial<ProjectStep> = {
            id: `temp_${Date.now()}`,
            title: newStepTitle.trim(),
            isCompleted: false,
        };
        const newSteps = [...steps, newStep];
        setSteps(newSteps);
        setNewStepTitle('');
        
        await handleSaveSteps(newSteps);
        
        // Automatically create the corresponding task
        try {
            const newTaskData: Omit<TaskEvent, 'id'> = {
                title: newStep.title || "New Task from Plan",
                description: newStep.description || '',
                status: 'todo',
                position: 0, // It will be placed at the top of the 'To Do' column
                projectId: project.id,
                stepId: newStep.id,
                userId: user.uid,
            };
            await addTask(newTaskData);
            toast({
                title: "Step & Task Created",
                description: `A task for "${newStep.title}" has been added to the project board.`,
                action: <Button asChild variant="link"><a onClick={() => router.push(`/projects/${projectId}/tasks`)}>View Board</a></Button>
            });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Task Creation Failed', description: error.message });
            // Optionally revert step creation
            const revertedSteps = steps.filter(s => s.id !== newStep.id);
            setSteps(revertedSteps);
            await handleSaveSteps(revertedSteps);
        }
    };
    
    const handleOpenStepDetails = (step: Partial<ProjectStep>) => {
        setStepToDetail(step);
        setStepDetailTitle(step.title || '');
        setStepDetailDescription(step.description || '');
        setIsStepDetailDialogOpen(true);
    };
    
    const handleSaveStepDetails = () => {
        if (!stepToDetail || !stepDetailTitle.trim()) {
            toast({ variant: "destructive", title: "Title is required." });
            return;
        }
        const updatedSteps = steps.map(s => 
            s.id === stepToDetail.id 
            ? { ...s, title: stepDetailTitle, description: stepDetailDescription } 
            : s
        );
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

    const handleOpenSaveTemplateDialog = () => {
      setNewTemplateName(templateToEdit ? templateToEdit.name : project?.name || '');
      setIsSaveTemplateDialogOpen(true);
    };

    const handleSaveOrUpdateTemplate = async () => {
        if (!user || !newTemplateName.trim()) {
            toast({ variant: 'destructive', title: 'Template name is required.' });
            return;
        }

        const templateData = {
            name: newTemplateName,
            description: project?.description || '',
            steps: steps.map(({ id, ...step }) => step),
        };

        try {
            if (templateToEdit) {
                // Update existing template
                await updateProjectTemplate(templateToEdit.id, templateData);
                setTemplates(prev => prev.map(t => t.id === templateToEdit.id ? { ...t, ...templateData } : t));
                toast({ title: 'Template Updated', description: `"${newTemplateName}" has been updated.` });
            } else {
                // Save new template
                const newTemplate = await addProjectTemplate({ ...templateData, userId: user.uid });
                setTemplates(prev => [...prev, newTemplate]);
                setTemplateToEdit(newTemplate); // Track that we are now working on an existing template
                toast({ title: 'Template Saved', description: `"${newTemplateName}" is now available for future projects.` });
            }
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
            setTemplateToEdit(template); // Track that we are now working on an existing template
            toast({ title: 'Template Loaded', description: `Steps from "${template.name}" have been applied.` });
            setIsManageTemplatesOpen(false); // Close dialog after loading
        }
    };

    const handleConfirmDeleteTemplate = async () => {
        if (!templateToDelete) return;
        try {
            await deleteProjectTemplate(templateToDelete.id);
            setTemplates(prev => prev.filter(t => t.id !== templateToDelete.id));
            toast({ title: 'Template Deleted' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
        } finally {
            setTemplateToDelete(null);
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
                                Back to Task Board
                                <ArrowLeft className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                </header>

                <div className="w-full max-w-4xl flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    {/* Project Plan Card */}
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
                                                <button onClick={() => handleOpenStepDetails(step)} className="text-sm flex-1 text-left truncate hover:underline">{step.title}</button>
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

                    {/* Templates Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Project Templates</CardTitle>
                            <CardDescription>Load a template to quickly populate your project plan, or save this plan for future use.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>Load a Template</Label>
                                <div className="flex items-center gap-2 mt-2">
                                    <Select onValueChange={handleLoadTemplate}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a template..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {templates.map(t => (
                                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button variant="outline" onClick={() => setIsManageTemplatesOpen(true)}>Manage</Button>
                                </div>
                            </div>
                             <div className="space-y-2">
                                <Button className="w-full" onClick={handleOpenSaveTemplateDialog}>
                                    <Save className="mr-2 h-4 w-4"/> {templateToEdit ? 'Save Changes to Template' : 'Save as New Template'}
                                </Button>
                            </div>
                        </CardContent>
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
                            <Input id="step-title" value={stepDetailTitle} onChange={(e) => setStepDetailTitle(e.target.value)} />
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
                    <AlertDialogDescription>This will permanently delete the step "{stepToDelete?.title}". This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteStep} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <Dialog open={isSaveTemplateDialogOpen} onOpenChange={setIsSaveTemplateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{templateToEdit ? 'Save Changes to Template' : 'Save as New Template'}</DialogTitle>
                        <DialogDescription>
                          {templateToEdit ? `This will overwrite the "${templateToEdit.name}" template.` : 'Save the current list of steps as a reusable template for future projects.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="template-name">Template Name</Label>
                        <Input id="template-name" value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveOrUpdateTemplate()}/>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsSaveTemplateDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveOrUpdateTemplate}>{templateToEdit ? 'Save Changes' : 'Save Template'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isManageTemplatesOpen} onOpenChange={setIsManageTemplatesOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Manage Project Templates</DialogTitle>
                  <DialogDescription>Load, edit, or delete your saved project templates.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <ScrollArea className="h-64 border rounded-md">
                    <div className="p-2 space-y-1">
                      {templates.map(template => (
                        <div key={template.id} className="flex items-center justify-between p-2 rounded-md hover:bg-accent group">
                          <span className="font-medium text-sm truncate">{template.name}</span>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleLoadTemplate(template.id)}>Load</Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setTemplateToEdit(template); handleOpenSaveTemplateDialog(); }}><Pencil className="h-4 w-4"/></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setTemplateToDelete(template)}><Trash2 className="h-4 w-4"/></Button>
                          </div>
                        </div>
                      ))}
                      {templates.length === 0 && <p className="text-sm text-center p-4 text-muted-foreground">No templates saved yet.</p>}
                    </div>
                  </ScrollArea>
                </div>
                 <DialogFooter>
                    <Button onClick={() => setIsManageTemplatesOpen(false)}>Close</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <AlertDialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete the template "{templateToDelete?.name}". This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDeleteTemplate} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
