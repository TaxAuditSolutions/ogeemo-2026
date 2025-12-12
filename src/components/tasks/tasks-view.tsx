
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, LoaderCircle, ListTodo, Route, Inbox, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Progress } from "@/components/ui/progress";
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getProjects, deleteProject, getTasksForUser, addProject, updateProject } from '@/services/project-service';
import { type Project, type Event as TaskEvent, type ProjectUrgency, type ProjectImportance } from '@/types/calendar';
import { getContacts, type Contact } from '@/services/contact-service';
import { NewTaskDialog } from './NewTaskDialog';
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
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const emptyInitialData = {};
export const ACTION_ITEMS_PROJECT_ID = 'inbox'; // Using 'inbox' to match legacy task data if any exists

const getPrioritySortValue = (p: Project) => {
    let score = 0;
    // Time Urgency: Urgent > Important > Optional
    if (p.urgency === 'urgent') score += 1000;
    if (p.urgency === 'important') score += 500;
    if (p.urgency === 'optional') score += 100;
    
    // Task Importance: A > B > C
    if (p.importance === 'A') score += 0.1;
    if (p.importance === 'B') score += 0.05;
    if (p.importance === 'C') score += 0.01;

    return score;
};

const ProjectCard = ({ project, tasks, contacts, onEdit, onDelete, onPriorityChange }: { project: Project, tasks: TaskEvent[], contacts: Contact[], onEdit: (p: Project) => void, onDelete: (p: Project) => void, onPriorityChange: (projectId: string, priority: 'urgency' | 'importance', value: ProjectUrgency | ProjectImportance) => void }) => {
    const router = useRouter();
    const isActionItems = project.id === ACTION_ITEMS_PROJECT_ID;
    const projectTasks = tasks.filter(t => t.projectId === project.id || (isActionItems && !t.projectId));
    const completedTasks = projectTasks.filter(t => t.status === 'done').length;
    const totalTasks = projectTasks.length;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const client = contacts.find(c => c.id === project.contactId);

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {isActionItems ? <Inbox className="h-5 w-5" /> : <ListTodo className="h-5 w-5" />}
                    {project.name}
                </CardTitle>
                <CardDescription>{isActionItems ? 'Your central place to capture new tasks.' : (client?.name || 'No client assigned')}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <p className="text-sm font-medium">Progress</p>
                        <p className="text-sm text-muted-foreground">{completedTasks} of {totalTasks} tasks complete</p>
                    </div>
                    <Progress value={progress} />
                </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2 items-stretch">
                <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => router.push(`/projects/${project.id}/tasks`)}><ListTodo className="mr-2 h-4 w-4" /> Task Board</Button>
                    {!isActionItems ? (
                      <Button variant="outline" onClick={() => router.push(`/projects/${project.id}/planning`)}><Route className="mr-2 h-4 w-4" /> Planning</Button>
                    ) : <div />}
                </div>
                {!isActionItems && (
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <div>
                        <Select value={project.urgency || 'important'} onValueChange={(v) => onPriorityChange(project.id, 'urgency', v as ProjectUrgency)}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="urgent">Urgent</SelectItem>
                                <SelectItem value="important">Important</SelectItem>
                                <SelectItem value="optional">Optional</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                         <Select value={project.importance || 'B'} onValueChange={(v) => onPriorityChange(project.id, 'importance', v as ProjectImportance)}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="A">A - Critical</SelectItem>
                                <SelectItem value="B">B - Important</SelectItem>
                                <SelectItem value="C">C - Optional</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                  </div>
                )}
                 {!isActionItems && (
                    <Button variant="secondary" className="w-full" onClick={() => onEdit(project)}>Edit Details</Button>
                )}
            </CardFooter>
        </Card>
    );
};


export function ProjectsView() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [tasks, setTasks] = useState<TaskEvent[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isNewItemDialogOpen, setIsNewItemDialogOpen] = useState(false);
    const [initialDialogData, setInitialDialogData] = useState(emptyInitialData);
    
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const inboxProject: Project = useMemo(() => ({
        id: ACTION_ITEMS_PROJECT_ID,
        name: "Action Items",
        description: "A place to capture all your incoming tasks and ideas before organizing them.",
        userId: user?.uid || '',
        createdAt: new Date(0), // Puts it at the top when sorting
    }), [user]);


    useEffect(() => {
        async function loadInitialData() {
            if (!user) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                const [fetchedProjects, fetchedContacts, fetchedTasks] = await Promise.all([
                    getProjects(user.uid),
                    getContacts(user.uid),
                    getTasksForUser(user.uid),
                ]);
                setProjects(fetchedProjects);
                setContacts(fetchedContacts);
                setTasks(fetchedTasks);

                const ideaToProjectRaw = sessionStorage.getItem('ogeemo-idea-to-project');
                if (ideaToProjectRaw) {
                    const ideaData = JSON.parse(ideaToProjectRaw);
                    setInitialDialogData({ name: ideaData.title, description: ideaData.description });
                    setIsNewItemDialogOpen(true);
                }

            } catch (error: any) {
                 toast({ variant: 'destructive', title: 'Failed to load initial data', description: error.message });
            } finally {
                setIsLoading(false);
            }
        }
        loadInitialData();
    }, [user, toast]);
    
    const handleProjectCreated = async (projectData: Omit<Project, 'id' | 'createdAt' | 'userId'>, tasks: []) => {
        if (!user) return;
        try {
            const newProject = await addProject({ ...projectData, userId: user.uid, createdAt: new Date() });
            setProjects(prev => [newProject, ...prev]);
            toast({ title: "Project Created", description: `"${newProject.name}" has been successfully created and placed in 'Planning'.` });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Failed to create project", description: error.message });
        }
    };

    const handleProjectUpdated = async (updatedProject: Project) => {
        try {
            const { id, userId, createdAt, ...dataToUpdate } = updatedProject;
            await updateProject(id, dataToUpdate);
            setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
            toast({ title: "Project Updated" });
        } catch (error: any) {
             toast({ variant: "destructive", title: "Failed to update project", description: error.message });
        }
    };
    
    const handlePriorityChange = async (projectId: string, priority: 'urgency' | 'importance', value: ProjectUrgency | ProjectImportance) => {
        const projectToUpdate = projects.find(p => p.id === projectId);
        if (!projectToUpdate) return;
        
        const updatedProject = { ...projectToUpdate, [priority]: value };
        
        // Optimistic UI update
        setProjects(prev => prev.map(p => p.id === projectId ? updatedProject : p));
        
        try {
            await updateProject(projectId, { [priority]: value });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not save priority change.'});
            // Revert on failure
            setProjects(prev => prev.map(p => p.id === projectId ? projectToUpdate : p));
        }
    };

    const handleConfirmDelete = async () => {
        if (!projectToDelete) return;
        try {
            const tasksToDelete = await getTasksForProject(projectToDelete.id);
            await deleteProject(projectToDelete.id, tasksToDelete.map(t => t.id));
            
            const newProjects = projects.filter(p => p.id !== projectToDelete.id);
            setProjects(newProjects);
            
            toast({ title: "Project Deleted" });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to delete project', description: error.message });
        } finally {
            setProjectToDelete(null);
        }
    };
    
    const handleEditProject = (project: Project) => {
        setProjectToEdit(project);
        setIsNewItemDialogOpen(true);
    };

    const planningProjects = projects.filter(p => p.status === 'planning');
    const activeProjects = projects.filter(p => p.status !== 'planning' && p.id !== ACTION_ITEMS_PROJECT_ID).sort((a, b) => getPrioritySortValue(b) - getPrioritySortValue(a));

    return (
        <>
            <NewTaskDialog
                isOpen={isNewItemDialogOpen}
                onOpenChange={(open) => {
                    setIsNewItemDialogOpen(open);
                    if (!open) {
                        setProjectToEdit(null);
                        if (sessionStorage.getItem('ogeemo-idea-to-project')) {
                             sessionStorage.removeItem('ogeemo-idea-to-project');
                        }
                    }
                }}
                onProjectCreate={handleProjectCreated}
                onProjectUpdate={handleProjectUpdated}
                contacts={contacts}
                onContactsChange={setContacts}
                projectToEdit={projectToEdit}
                initialData={initialDialogData}
            />
            
            <div className="p-4 sm:p-6 flex flex-col h-full items-center">
                <header className="text-center mb-6">
                    <h1 className="text-3xl font-bold font-headline text-primary">Project Manager</h1>
                    <p className="text-muted-foreground">Manage your projects, view tasks, or create a new project.</p>
                </header>

                <div className="w-full max-w-7xl flex-1 space-y-8">
                    <div className="flex justify-end mb-4">
                        <Button onClick={() => { setProjectToEdit(null); setInitialDialogData({}); setIsNewItemDialogOpen(true); }}>
                            <Plus className="mr-2 h-4 w-4" /> New Project
                        </Button>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center h-full pt-16">
                            <LoaderCircle className="h-8 w-8 animate-spin" />
                        </div>
                    ) : (
                        <>
                            {planningProjects.length > 0 && (
                                <div>
                                    <h2 className="text-xl font-semibold mb-4 text-center">In Planning</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {planningProjects.map((p) => (
                                            <ProjectCard
                                                key={p.id}
                                                project={p}
                                                tasks={tasks}
                                                contacts={contacts}
                                                onEdit={handleEditProject}
                                                onDelete={setProjectToDelete}
                                                onPriorityChange={handlePriorityChange}
                                            />
                                        ))}
                                    </div>
                                    <hr className="my-8" />
                                </div>
                            )}

                            <h2 className="text-xl font-semibold mb-4 text-center">Active Projects & Action Items</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <ProjectCard
                                    key={inboxProject.id}
                                    project={inboxProject}
                                    tasks={tasks}
                                    contacts={contacts}
                                    onEdit={handleEditProject}
                                    onDelete={setProjectToDelete}
                                    onPriorityChange={handlePriorityChange}
                                />
                                {activeProjects.map((p) => (
                                    <ProjectCard
                                        key={p.id}
                                        project={p}
                                        tasks={tasks}
                                        contacts={contacts}
                                        onEdit={handleEditProject}
                                        onDelete={setProjectToDelete}
                                        onPriorityChange={handlePriorityChange}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
            

            <AlertDialog open={!!projectToDelete} onOpenChange={() => setProjectToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the project "{projectToDelete?.name}" and all of its tasks. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
