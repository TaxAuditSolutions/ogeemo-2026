
'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  ListChecks,
  Route,
  GitMerge,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getProjects, deleteProject, getTasksForProject, addProject, deleteProjects } from '@/services/project-service';
import { getContacts, type Contact } from '@/services/contact-service';
import { type Project, type Event as TaskEvent, type ProjectStatus } from '@/types/calendar-types';
import { ProjectManagementHeader } from './ProjectManagementHeader';
import { Checkbox } from '../ui/checkbox';
import { NewProjectDialog } from './NewProjectDialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';


const statusDisplayMap: Record<ProjectStatus, string> = {
  planning: 'Planning',
  active: 'Active',
  'on-hold': 'On Hold',
  completed: 'Completed',
};

export function ProjectListView() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  
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
  
  const handleToggleSelect = (projectId: string) => {
    setSelectedProjectIds(prev => 
        prev.includes(projectId) 
        ? prev.filter(id => id !== projectId) 
        : [...prev, projectId]
    );
  };
  
  const handleToggleSelectAll = () => {
    if (selectedProjectIds.length === projects.length) {
        setSelectedProjectIds([]);
    } else {
        setSelectedProjectIds(projects.map(p => p.id));
    }
  };
  
  const handleConfirmBulkDelete = async () => {
    if (selectedProjectIds.length === 0) return;
    
    const originalProjects = [...projects];
    const projectsToDelete = projects.filter(p => selectedProjectIds.includes(p.id));
    setProjects(prev => prev.filter(p => !selectedProjectIds.includes(p.id)));

    try {
        await deleteProjects(projectsToDelete.map(p => p.id));
        toast({ title: `${selectedProjectIds.length} Project(s) Deleted` });
        setSelectedProjectIds([]);
    } catch (error: any) {
        setProjects(originalProjects);
        toast({ variant: "destructive", title: "Bulk Delete Failed", description: error.message });
    } finally {
        setIsBulkDeleteAlertOpen(false);
    }
  };
  
  const handleDelete = (project: Project) => {
    setProjectToDelete(project);
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
  
  const handleProjectCreated = async (projectData: Omit<Project, 'id' | 'createdAt' | 'userId'>) => {
    if (!user) return;
    setIsNewProjectDialogOpen(false);
    try {
        const newProject = await addProject({ ...projectData, status: 'planning', userId: user.uid, createdAt: new Date() });
        toast({ title: "Project Created", description: `"${newProject.name}" has been successfully created.` });
        router.push(`/project-plan?projectId=${newProject.id}`);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Failed to create project", description: error.message });
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
      <div className="p-4 sm:p-6 space-y-6">
        <ProjectManagementHeader />
        
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>Projects ({projects.length})</CardTitle>
            <div className="flex items-center gap-2">
                {selectedProjectIds.length > 0 && (
                    <Button variant="destructive" size="sm" onClick={() => setIsBulkDeleteAlertOpen(true)}>
                        <Trash2 className="mr-2 h-4 w-4"/> Delete Selected
                    </Button>
                )}
                 <Button onClick={() => setIsNewProjectDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> New Project
                 </Button>
                 <Button onClick={() => setIsTestDialogOpen(true)}>test</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                        <Checkbox 
                            onCheckedChange={handleToggleSelectAll}
                            checked={projects.length > 0 && selectedProjectIds.length === projects.length}
                            aria-label="Select all projects"
                        />
                    </TableHead>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map(p => {
                    const contact = contacts.find(c => c.id === p.contactId);
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                            <Checkbox 
                                onCheckedChange={() => handleToggleSelect(p.id)}
                                checked={selectedProjectIds.includes(p.id)}
                                aria-label={`Select project ${p.name}`}
                            />
                        </TableCell>
                        <TableCell className="font-medium">
                          <Link href={`/projects/${p.id}/tasks`} className="hover:underline">
                            {p.name}
                          </Link>
                        </TableCell>
                        <TableCell>{contact?.name || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{statusDisplayMap[p.status || 'planning']}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                           <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/projects/${p.id}/tasks`}>
                                  <ListChecks className="mr-2 h-4 w-4" /> Task Board
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/project-plan?projectId=${p.id}`}>
                                    <Route className="mr-2 h-4 w-4" /> Plan Project
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleDelete(p)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete Project</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <NewProjectDialog
        isOpen={isNewProjectDialogOpen}
        onOpenChange={setIsNewProjectDialogOpen}
        onProjectCreate={handleProjectCreated}
        contacts={contacts}
      />
      
      <AlertDialog open={!!projectToDelete} onOpenChange={() => setProjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the project "{projectToDelete?.name}" and all of its tasks. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBulkDeleteAlertOpen} onOpenChange={setIsBulkDeleteAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete {selectedProjectIds.length} project(s) and all associated tasks. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmBulkDelete} className="bg-destructive hover:bg-destructive/90">
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Make it happen</DialogTitle>
            </DialogHeader>
            <div className="py-4">
                <div className="space-y-2">
                    <Label htmlFor="nomenclature-field">Nomenclature</Label>
                    <Input id="nomenclature-field" placeholder="Enter info..." />
                </div>
            </div>
            <DialogFooter className="gap-2 justify-end">
                <Button variant="ghost" onClick={() => setIsTestDialogOpen(false)}>Cancel</Button>
                <Button>Save</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
