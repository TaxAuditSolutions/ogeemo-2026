
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDrop } from 'react-dnd';
import { LoaderCircle, ListChecks } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getProjects, updateProject, type Project, type ProjectStatus } from '@/services/project-service';
import { getContacts, type Contact } from '@/services/contact-service';
import { DraggableProjectCard, ItemTypes } from './DraggableProjectCard';
import { cn } from '@/lib/utils';
import { ProjectManagementHeader } from '@/components/tasks/ProjectManagementHeader';

const statusColumns: ProjectStatus[] = ['planning', 'active', 'on-hold', 'completed'];

const statusTitles: Record<ProjectStatus, string> = {
    planning: 'In Planning',
    active: 'Active',
    'on-hold': 'On Hold',
    completed: 'Completed',
};

const ProjectColumn = ({ title, status, projects, clientMap, onDrop, onEdit }: { title: string; status: ProjectStatus; projects: Project[]; clientMap: Map<string, string>; onDrop: (item: Project, targetStatus: ProjectStatus) => void; onEdit: (project: Project) => void; }) => {
    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: ItemTypes.PROJECT_CARD,
        drop: (item: Project) => onDrop(item, status),
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    }));

    return (
        <Card ref={drop} className={cn("flex flex-col", isOver && canDrop && "bg-primary/10")}>
            <CardHeader className="text-center">
                <CardTitle>{title} ({projects.length})</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-2 p-2">
                {projects.map((project, index) => (
                    <DraggableProjectCard
                        key={project.id}
                        project={project}
                        clientName={clientMap.get(project.contactId || '') || 'No Client'}
                        index={index}
                        status={status}
                        moveCard={() => {}} // Simple drag and drop between columns, no reordering within
                        onClick={() => onEdit(project)}
                    />
                ))}
            </CardContent>
        </Card>
    );
};

export function ProjectStatusView() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const loadData = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const [fetchedProjects, fetchedContacts] = await Promise.all([
                getProjects(user.uid),
                getContacts(user.uid),
            ]);
            setProjects(fetchedProjects);
            setContacts(fetchedContacts);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to load data', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const clientMap = useMemo(() => {
        return new Map(contacts.map(c => [c.id, c.name]));
    }, [contacts]);

    const projectsByStatus = useMemo(() => {
        const grouped: Record<ProjectStatus, Project[]> = {
            planning: [],
            active: [],
            'on-hold': [],
            completed: [],
        };
        projects.forEach(p => {
            const status = p.status || 'planning';
            if (grouped[status]) {
                grouped[status].push(p);
            }
        });
        return grouped;
    }, [projects]);
    
    const handleDropProject = useCallback(async (project: Project, newStatus: ProjectStatus) => {
        if (project.status === newStatus) return;

        const originalProjects = projects;
        const updatedProjects = projects.map(p => 
            p.id === project.id ? { ...p, status: newStatus } : p
        );
        setProjects(updatedProjects);

        try {
            await updateProject(project.id, { status: newStatus });
            toast({
                title: 'Project Status Updated',
                description: `"${project.name}" moved to ${statusTitles[newStatus]}.`
            });
        } catch (error: any) {
            setProjects(originalProjects); // Revert on failure
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
        }
    }, [projects, toast]);

    const handleEditProject = (project: Project) => {
        router.push(`/projects/${project.id}/tasks`);
    };

    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center p-4">
                <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="p-4 sm:p-6 flex flex-col h-full items-center">
            <header className="text-center mb-6">
                <h1 className="text-3xl font-bold font-headline text-primary flex items-center justify-center gap-2">
                    <ListChecks className="h-8 w-8"/>
                    Project Status
                </h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                    Drag and drop projects to update their status.
                </p>
            </header>
            
            <ProjectManagementHeader />

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl mt-4">
                {statusColumns.map(status => (
                    <ProjectColumn
                        key={status}
                        title={statusTitles[status]}
                        status={status}
                        projects={projectsByStatus[status]}
                        clientMap={clientMap}
                        onDrop={handleDropProject}
                        onEdit={handleEditProject}
                    />
                ))}
            </div>
        </div>
    );
}
