
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { getProjectById, updateProject } from '@/services/project-service';
import { type Project, type ProjectStep } from '@/types/calendar-types';
import { LoaderCircle, ArrowLeft } from 'lucide-react';

export default function ProjectStepsView() {
    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
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
        </div>
    );
}
