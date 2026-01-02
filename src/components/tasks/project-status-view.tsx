
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDrop } from 'react-dnd';
import { LoaderCircle, ListChecks, Edit, Trash2, Plus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getProjects, updateProject, deleteProject, getTasksForProject, addProject, type Project, type ProjectStatus } from '@/services/project-service';
import { getContacts, type Contact } from '@/services/contact-service';
import { DraggableProjectCard, ItemTypes } from '@/components/dashboard/DraggableProjectCard';
import { cn } from '@/lib/utils';
import { ProjectManagementHeader } from '@/components/tasks/ProjectManagementHeader';
import { NewTaskDialog } from '../tasks/NewTaskDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { type Event as TaskEvent } from '@/types/calendar';
import { Button } from '../ui/button';

const statusColumns: ProjectStatus[] = ['planning', 'active', 'on-hold', 'completed'];

const statusTitles: Record<ProjectStatus, string> = {
    planning: 'In Planning',
    active: 'Active',
    'on-hold': 'On Hold',
    completed: 'Completed',
};

const ProjectColumn = ({ title, status, projects, clientMap, onDrop, onEdit, onDelete }: { title: string; status: ProjectStatus; projects: Project[]; clientMap: Map<string, string>; onDrop: (item: Project, targetStatus: ProjectStatus) => void; onEdit: (project: Project) => void; onDelete?: (project: Project) => void; }) => {
    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: ItemTypes.PROJECT_CARD,
        drop: (item: Project) => onDrop(item, status),
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    }));

    const router = useRouter();

    const handleCardClick = (project: Project) => {
        if (onEdit && status === 'planning') {
            onEdit(project);
        } else {
            router.push(`/projects/${project.id}/tasks`);
        }
    };

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
                        onClick={() => handleCardClick(project)}
                        onEdit={onEdit && status === 'planning' ? () => onEdit(project) : undefined}
                        onDelete={onDelete && status === 'planning' ? () => onDelete(project) : undefined}
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
    const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

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
        setProjectToEdit(project);
        setIsFormOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!projectToDelete) return;
        try {
            const tasksToDelete = await getTasksForProject(projectToDelete.id);
            await deleteProject(projectToDelete.id, tasksToDelete.map(t => t.id));
            setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
            toast({ title: 'Project Deleted' });
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Failed to delete project', description: error.message });
        } finally {
            setProjectToDelete(null);
        }
    };
    
    const handleProjectUpdated = async (updatedProject: Project) => {
        setIsFormOpen(false);
        setProjectToEdit(null);
        try {
            const { id, userId, createdAt, ...dataToUpdate } = updatedProject;
            await updateProject(id, dataToUpdate);
            toast({ title: 'Project Updated' });
            loadData(); // Refresh data from the database
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
        }
    };
    
    const handleProjectCreated = async (projectData: Omit<Project, 'id' | 'createdAt' | 'userId'>, tasks: Omit<TaskEvent, 'id' | 'userId' | 'projectId'>[]) => {
        if (!user) return;
        try {
            const newProject = await addProject({ ...projectData, status: 'planning', userId: user.uid, createdAt: new Date() });
            toast({ title: "Project Created", description: `"${newProject.name}" has been successfully created.` });
            router.push(`/projects/${newProject.id}/tasks`);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Failed to create project", description: error.message });
        } finally {
            setIsFormOpen(false);
        }
    };


    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center p-4">
                <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <>
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
                
                <div className="flex items-center gap-4">
                    <ProjectManagementHeader />
                    <Button onClick={() => { setProjectToEdit(null); setIsFormOpen(true); }}>
                        <Plus className="mr-2 h-4 w-4" /> New Project
                    </Button>
                </div>

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
                            onDelete={setProjectToDelete}
                        />
                    ))}
                </div>
            </div>

            <NewTaskDialog
                isOpen={isFormOpen}
                onOpenChange={(open) => {
                    setIsFormOpen(open);
                    if (!open) {
                        setProjectToEdit(null);
                    }
                }}
                onProjectCreate={handleProjectCreated}
                onProjectUpdate={handleProjectUpdated}
                contacts={contacts}
                onContactsChange={setContacts}
                projectToEdit={projectToEdit}
            />

            <AlertDialog open={!!projectToDelete} onOpenChange={() => setProjectToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete the project "{projectToDelete?.name}" and all associated tasks. This cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
