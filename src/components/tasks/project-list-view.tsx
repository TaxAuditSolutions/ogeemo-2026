
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
  FilePlus2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  DropdownMenuSeparator,
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
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getProjects, deleteProject, getTasksForProject, addProject, updateProject, type Project, type ProjectStatus, deleteProjects, addProjectTemplate } from '@/services/project-service';
import { getContacts, type Contact, mergeContacts } from '@/services/contact-service';
import { ProjectManagementHeader } from '@/components/tasks/ProjectManagementHeader';
import { Checkbox } from '../ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { cn } from '@/lib/utils';
import ContactFormDialog from '../contacts/contact-form-dialog';
import { getFolders as getContactFolders, type FolderData } from '@/services/contact-folder-service';
import { getCompanies, type Company } from "@/services/accounting-service";
import { getIndustries, type Industry } from '@/services/industry-service';
import { type Event as TaskEvent } from '@/types/calendar-types';
import MergeContactsDialog from '../contacts/MergeContactsDialog';

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
  
  const handleDeleteSelected = () => {
    if (selectedProjectIds.length > 0) {
      setIsBulkDeleteAlertOpen(true);
    }
  };
  
  const handleConfirmBulkDelete = async () => {
    if (!user || selectedProjectIds.length === 0) return;
    try {
        await deleteProjects(selectedProjectIds);
        toast({ title: `${'${selectedProjectIds.length}'} project(s) deleted.`});
        setSelectedProjectIds([]);
        loadData();
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Bulk delete failed', description: error.message });
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

  const handleContactSave = (savedContact: Contact, isEditing: boolean) => {
      if (isEditing) {
          setContacts(prev => prev.map(c => c.id === savedContact.id ? savedContact : c));
      } else {
          setContacts(prev => [...prev, savedContact]);
      }
      setIsContactFormOpen(false);
  };
  
  const handleMergeClick = (contact: Contact) => {
    setContactToMerge(contact);
    setIsMergeDialogOpen(true);
  };

  const handleMergeConfirm = async (sourceContactId: string, masterContactId: string) => {
    try {
        await mergeContacts(sourceContactId, masterContactId);
        setContacts(prev => prev.filter(c => c.id !== sourceContactId));
        toast({ title: 'Merge Successful', description: 'The contact has been merged and the duplicate was removed.' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Merge Failed', description: error.message });
    }
  };

  const handleCreateTemplate = async (project: Project) => {
    if (!user) return;
    try {
      const templateData = {
        name: `${'${project.name}'} Template`,
        description: project.description || `Template based on project: ${'${project.name}'}`,
        steps: project.steps || [],
        userId: user.uid,
      };
      await addProjectTemplate(templateData);
      toast({
        title: 'Template Created',
        description: `A new template based on "${'${project.name}'}" has been saved.`,
      });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to create template', description: error.message });
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
        <header className="text-center mb-6">
          <div className="flex justify-center items-center gap-4 mb-2">
              <Briefcase className="h-10 w-10 text-primary" />
              <h1 className="text-4xl font-bold font-headline text-primary">
                Project List
              </h1>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A complete list of all your projects. Click a project to view its task board.
          </p>
           <div className="mt-4">
               <ProjectManagementHeader />
           </div>
        </header>
        
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>Projects ({projects.length})</CardTitle>
            <div className="flex items-center gap-2">
                {selectedProjectIds.length > 0 && (
                    <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
                        <Trash2 className="mr-2 h-4 w-4"/> Delete Selected
                    </Button>
                )}
                 <Button asChild>
                    <Link href="/projects/test-102">
                        <Plus className="mr-2 h-4 w-4" /> Create New Project
                    </Link>
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
                    <TableHead>Test P Field</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center h-24">
                            <LoaderCircle className="mx-auto h-6 w-6 animate-spin" />
                        </TableCell>
                    </TableRow>
                  ) : projects.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                           No projects found.
                        </TableCell>
                    </TableRow>
                  ) : (
                  projects.map(p => {
                    const contact = contacts.find(c => c.id === p.contactId);
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                            <Checkbox 
                                onCheckedChange={() => handleToggleSelect(p.id)}
                                checked={selectedProjectIds.includes(p.id)}
                                aria-label={`Select project ${'${p.name}'}`}
                            />
                        </TableCell>
                        <TableCell className="font-medium">
                          <Link href={`/projects/${'${p.id}'}/tasks`} className="hover:underline">
                            {p.name}
                          </Link>
                        </TableCell>
                        <TableCell>{contact?.name || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{statusDisplayMap[p.status || 'planning']}</Badge>
                        </TableCell>
                        <TableCell>{p.testPField}</TableCell>
                        <TableCell className="text-right">
                           <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/projects/${'${p.id}'}/tasks`}>
                                  <ListChecks className="mr-2 h-4 w-4" /> Task Board
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/project-plan?projectId=${'${p.id}'}`}>
                                    <Route className="mr-2 h-4 w-4" /> Plan Project
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/projects/test-102?projectId=${'${p.id}'}`}>
                                  <Pencil className="mr-2 h-4 w-4" /> Edit Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleCreateTemplate(p)}>
                                <FilePlus2 className="mr-2 h-4 w-4" /> Create Template from Project
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(p)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete Project</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      
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
      {contactToMerge && (
        <MergeContactsDialog
          isOpen={isMergeDialogOpen}
          onOpenChange={setIsMergeDialogOpen}
          sourceContact={contactToMerge}
          allContacts={contacts}
          onMergeConfirm={handleMergeConfirm}
        />
      )}
    </>
  );
}
