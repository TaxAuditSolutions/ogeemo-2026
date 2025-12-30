
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { getProjectById, updateProject } from '@/services/project-service';
import { type Project, type ProjectStep } from '@/types/calendar-types';
import { LoaderCircle, Plus, Trash2, Save, ArrowLeft } from 'lucide-react';

const emptyStep: Partial<ProjectStep> = {
    title: '',
    durationMinutes: 60,
    isBillable: true,
    connectToCalendar: true,
    isCompleted: false,
};

export default function ProjectStepsView() {
    const [project, setProject] = useState<Project | null>(null);
    const [steps, setSteps] = useState<Partial<ProjectStep>[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const router = useRouter();
    const searchParams = useSearchParams();
    const projectId = searchParams.get('projectId');
    const { user } = useAuth();
    const { toast } = useToast();

    const loadProject = useCallback(async () => {
        if (!user || !projectId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const projectData = await getProjectById(projectId);
            if (projectData) {
                setProject(projectData);
                // Ensure every step has a temporary or permanent ID for key prop
                const stepsWithIds = (projectData.steps || []).map((step, index) => ({
                    ...step,
                    id: step.id || `temp_${index}_${Date.now()}`
                }));
                setSteps(stepsWithIds);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Project not found.' });
                router.push('/projects');
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to load project', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [projectId, user, toast, router]);

    useEffect(() => {
        loadProject();
    }, [loadProject]);
    
    const handleAddStep = () => {
        setSteps(prev => [...prev, { ...emptyStep, id: `temp_new_${Date.now()}` }]);
    };

    const handleStepChange = (index: number, field: keyof ProjectStep, value: string | number | boolean) => {
        setSteps(prev => {
            const newSteps = [...prev];
            const stepToUpdate = { ...newSteps[index], [field]: value };
            newSteps[index] = stepToUpdate;
            return newSteps;
        });
    };

    const handleDeleteStep = (id: string | number) => {
        setSteps(prev => prev.filter(step => step.id !== id));
    };
    
    const handleSavePlan = async () => {
        if (!project) return;
        setIsSaving(true);
        try {
            const finalSteps = steps.map(step => ({ ...step, id: step.id?.toString().startsWith('temp_') ? undefined : step.id }));
            await updateProject(project.id, { steps: finalSteps as any });
            toast({ title: 'Plan Saved', description: `Your project plan for "${project.name}" has been updated.` });
            router.push(`/projects/${project.id}/timeline`);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };


    if (isLoading) {
        return <div className="flex h-full w-full items-center justify-center"><LoaderCircle className="h-10 w-10 animate-spin" /></div>;
    }

    if (!project) {
        return <div className="p-8 text-center">Project could not be loaded.</div>;
    }

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <header className="flex justify-between items-center">
                <div className="text-center flex-1">
                    <h1 className="text-3xl font-bold font-headline text-primary">Project Organizer</h1>
                    <p className="text-muted-foreground">{project.name}</p>
                </div>
                 <Button variant="outline" onClick={() => router.push(`/projects/${project.id}/timeline`)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Timeline
                </Button>
            </header>

            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle>Project Steps</CardTitle>
                    <CardDescription>
                        Break down your project into manageable steps. Define each task and estimate its duration.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-3">
                        {steps.map((step, index) => (
                            <div key={step.id} className="flex items-center gap-4 p-3 border rounded-lg">
                                <div className="grid grid-cols-2 gap-4 flex-1">
                                    <div className="space-y-2 col-span-2">
                                        <Label htmlFor={`step-title-${index}`}>Step Title</Label>
                                        <Input
                                            id={`step-title-${index}`}
                                            value={step.title || ''}
                                            onChange={(e) => handleStepChange(index, 'title', e.target.value)}
                                            placeholder="e.g., Initial client meeting"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor={`step-duration-${index}`}>Est. Duration (minutes)</Label>
                                        <Input
                                            id={`step-duration-${index}`}
                                            type="number"
                                            value={step.durationMinutes || ''}
                                            onChange={(e) => handleStepChange(index, 'durationMinutes', Number(e.target.value))}
                                            placeholder="e.g., 60"
                                        />
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteStep(step.id!)}>
                                    <Trash2 className="h-5 w-5 text-destructive" />
                                </Button>
                            </div>
                        ))}
                    </div>
                    <Button variant="outline" onClick={handleAddStep} className="w-full">
                        <Plus className="mr-2 h-4 w-4" /> Add Step
                    </Button>
                </CardContent>
                <CardFooter className="justify-end">
                    <Button onClick={handleSavePlan} disabled={isSaving}>
                        {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Plan
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
