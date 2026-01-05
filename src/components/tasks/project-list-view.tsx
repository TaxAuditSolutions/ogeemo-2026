
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  ChevronsUpDown,
  Check,
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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getProjects, deleteProject, getTasksForProject, addProject, updateProject } from '@/services/project-service';
import { getContacts, type Contact } from '@/services/contact-service';
import { type Project, type Event as TaskEvent, type ProjectStatus } from '@/types/calendar-types';
import { ProjectManagementHeader } from './ProjectManagementHeader';
import { Checkbox } from '../ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { cn } from '@/lib/utils';
import ContactFormDialog from '../contacts/contact-form-dialog';
import { getFolders as getContactFolders, type FolderData } from '@/services/contact-folder-service';
import { getCompanies, type Company } from '@/services/accounting-service';
import { getIndustries, type Industry } from '@/services/industry-service';
import { Textarea } from '../ui/textarea';

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
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectContactId, setNewProjectContactId] = useState<string | null>(null);
  const [isContactPopoverOpen, setIsContactPopoverOpen] = useState(false);

  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [contactFolders, setContactFolders] = useState<FolderData[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customIndustries, setCustomIndustries] = useState<Industry[]>([]);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [contactToMerge, setContactToMerge] = useState<Contact | null>(null);


  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const loadData = useCallback(async () => {
    if (!user) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
        const [fetchedProjects, fetchedContacts, fetchedFolders, fetchedCompanies, fetchedIndustries] = await Promise.all([
            getProjects(user.uid),
            getContacts(user.uid),
            getContactFolders(user.uid),
            getCompanies(user.uid),
            getIndustries(user.uid),
        ]);
        setProjects(fetchedProjects);
        setContacts(fetchedContacts);
        setContactFolders(fetchedFolders);
        setCompanies(fetchedCompanies);
        setCustomIndustries(fetchedIndustries);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Failed to load data', description: error.message });
    } finally {
        setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  
  useEffect(() => {
    const title = searchParams.get('title');
    const description = searchParams.get('description');
    if (title) {
      setProjectToEdit(null); // Ensure we're in "create" mode
      setNewProjectName(title);
      setNewProjectDescription(description || '');
      setNewProjectContactId(null);
      setIsNewProjectDialogOpen(true);
      // Clean up URL to prevent re-opening dialog on refresh
      router.replace('/projects/all');
    }
  }, [searchParams, router]);
  
  useEffect(() => {
    if (isNewProjectDialogOpen) {
      if (projectToEdit) {
        setNewProjectName(projectToEdit.name);
        setNewProjectDescription(projectToEdit.description || '');
        setNewProjectContactId(projectToEdit.contactId || null);
      } else if (!searchParams.get('title')) {
        setNewProjectName('');
        setNewProjectDescription('');
        setNewProjectContactId(null);
      }
    }
  }, [isNewProjectDialogOpen, projectToEdit, searchParams]);

  const clientMap = useMemo(() => {
    return new Map(contacts.map(c => [c.id, c.name]));
  }, [contacts]);
  
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
    // This function will need to be implemented
  };
  
  const handleDelete = (project: Project) => {
    setProjectToDelete(project);
  };
  
  const handleEdit = (project: Project) => {
    setProjectToEdit(project);
    setIsNewProjectDialogOpen(true);
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

  const handleSaveProject = async () => {
    if (!user || !newProjectName.trim()) {
        toast({ variant: 'destructive', title: 'Project Name is required' });
        return;
    }

    const projectData = {
        name: newProjectName.trim(),
        description: newProjectDescription.trim(),
        contactId: newProjectContactId,
    };

    try {
        if (projectToEdit) {
            await updateProject(projectToEdit.id, projectData);
            toast({ title: "Project Updated" });
        } else {
            const newProject = await addProject({ ...projectData, status: 'planning', userId: user.uid, createdAt: new Date() });
            toast({ title: "Project Created", description: `Project "${newProject.name}" has been created.` });
            router.push(`/project-plan?projectId=${newProject.id}`);
        }
        loadData();
        setIsNewProjectDialogOpen(false);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Failed to save project', description: error.message });
    }
  };

  const handleContactSave = (savedContact: Contact, isEditing: boolean) => {
      if (isEditing) {
          setContacts(prev => prev.map(c => c.id === savedContact.id ? savedContact : c));
      } else {
          setContacts(prev => [...prev, savedContact]);
      }
      setNewProjectContactId(savedContact.id);
      setIsContactFormOpen(false);
  };
  
  const selectedContact = contacts.find(c => c.id === newProjectContactId);

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
                 <Button onClick={() => { setProjectToEdit(null); setIsNewProjectDialogOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" /> Create New Project
                 </Button>
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
                              <DropdownMenuItem onSelect={() => handleEdit(p)}>
                                <Pencil className="mr-2 h-4 w-4" /> View / Edit
                              </DropdownMenuItem>
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
                              <DropdownMenuItem onClick={() => handleDelete(p)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete Project</DropdownMenuItem>
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

      <Dialog open={isNewProjectDialogOpen} onOpenChange={setIsNewProjectDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{projectToEdit ? 'Edit Project' : 'New Project'}</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="nomenclature-field">Project Name</Label>
                    <Input id="nomenclature-field" placeholder="Enter the new project name" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="description-field">Project Description</Label>
                    <Textarea id="description-field" placeholder="Enter a brief description..." value={newProjectDescription} onChange={(e) => setNewProjectDescription(e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label>Project Leader</Label>
                    <div className="flex items-center gap-2">
                         <Popover open={isContactPopoverOpen} onOpenChange={setIsContactPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full justify-between">
                                    <span className="truncate">{selectedContact ? selectedContact.name : "Select a contact..."}</span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput placeholder="Search contacts..." />
                                    <CommandList>
                                        <CommandEmpty>No contact found.</CommandEmpty>
                                        <CommandGroup>
                                            {contacts.map((c) => (
                                                <CommandItem key={c.id} value={c.name} onSelect={() => { setNewProjectContactId(c.id); setIsContactPopoverOpen(false); }}>
                                                    <Check className={cn("mr-2 h-4 w-4", newProjectContactId === c.id ? "opacity-100" : "opacity-0")} />
                                                    {c.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        <Button type="button" variant="outline" onClick={() => setIsContactFormOpen(true)}><Plus className="mr-2 h-4 w-4"/>New</Button>
                    </div>
                </div>
            </div>
            <DialogFooter className="gap-2 justify-end">
                <Button variant="ghost" onClick={() => setIsNewProjectDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveProject}>Save</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
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
                <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <ContactFormDialog
        isOpen={isContactFormOpen}
        onOpenChange={setIsContactFormOpen}
        contactToEdit={null}
        folders={contactFolders}
        onFoldersChange={setContactFolders}
        onSave={handleContactSave}
        companies={companies}
        onCompaniesChange={setCompanies}
        customIndustries={customIndustries}
        onCustomIndustriesChange={setCustomIndustries}
      />
    </>
  );
}
