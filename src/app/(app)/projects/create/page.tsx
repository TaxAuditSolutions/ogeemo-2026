"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
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
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ChevronsUpDown, Check, Plus, MoreVertical, Trash2, LoaderCircle, X, Info, FilePlus2, FileText, Save, Pencil } from 'lucide-react';
import { addProject, getProjectTemplates, updateProjectTemplate, deleteProjectTemplate, type Project, type ProjectTemplate, getProjectById, updateProject } from '@/services/project-service';
import { getContacts, type Contact } from '@/services/contact-service';
import ContactFormDialog from '@/components/contacts/contact-form-dialog';
import { getFolders as getContactFolders, type FolderData } from '@/services/contact-folder-service';
import { getCompanies, type Company } from '@/services/accounting-service';
import { getIndustries, type Industry } from '@/services/industry-service';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { ProjectManagementHeader } from '@/components/tasks/ProjectManagementHeader';
import { type Event as TaskEvent } from '@/types/calendar-types';

export default function CreateProjectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  
  const [creationStep, setCreationStep] = useState<'choice' | 'form'>('choice');
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactFolders, setContactFolders] = useState<FolderData[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customIndustries, setCustomIndustries] = useState<Industry[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [isContactPopoverOpen, setIsContactPopoverOpen] = useState(false);
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  
  const [isTemplateFormOpen, setIsTemplateFormOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<ProjectTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<ProjectTemplate | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  
  const [projectToEditId, setProjectToEditId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) {
      setIsLoadingData(false);
      return;
    }
    setIsLoadingData(true);
    try {
      const [foldersData, companiesData, industriesData, contactsData, templatesData] = await Promise.all([
        getContactFolders(user.uid),
        getCompanies(user.uid),
        getIndustries(user.uid),
        getContacts(user.uid),
        getProjectTemplates(user.uid),
      ]);
      setContactFolders(foldersData);
      setCompanies(companiesData);
      setCustomIndustries(industriesData);
      setContacts(contactsData);
      setTemplates(templatesData);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load necessary data.' });
    } finally {
      setIsLoadingData(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!isAuthLoading) {
      loadData();
    }
  }, [isAuthLoading, loadData]);
  
  useEffect(() => {
    if (isAuthLoading || isLoadingData) return;

    const projectId = searchParams.get('projectId');
    if (projectId && user) {
      setProjectToEditId(projectId);
      setCreationStep('form');
      const loadProject = async () => {
        try {
          const projectData = await getProjectById(projectId);
          if (projectData) {
            setProjectName(projectData.name);
            setDescription(projectData.description || '');
            setSelectedContactId(projectData.contactId || null);
          }
        } catch (error) {
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to load project data.' });
        }
      };
      loadProject();
    }
  }, [searchParams, user, isAuthLoading, isLoadingData, toast]);

  const handleContactSave = (savedContact: Contact, isEditing: boolean) => {
      if (isEditing) {
          setContacts(prev => prev.map(c => c.id === savedContact.id ? savedContact : c));
      } else {
          setContacts(prev => [...prev, savedContact]);
      }
      setSelectedContactId(savedContact.id);
      setIsContactFormOpen(false);
  };
  
  const handleStartBlank = () => {
    setProjectToEditId(null);
    setProjectName('');
    setDescription('');
    setSelectedContactId(null);
    setSelectedTemplateId(null);
    setCreationStep('form');
  };

  const handleSelectTemplate = (template: ProjectTemplate) => {
    setProjectToEditId(null);
    setProjectName(template.name);
    setDescription(template.description || '');
    setSelectedContactId(null); 
    setSelectedTemplateId(template.id);
    setCreationStep('form');
  };

  const handleSave = async () => {
    if (!user) return;
    if (!projectName.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Project Name is required." });
      return;
    }

    setIsSaving(true);
    try {
        if (projectToEditId) {
            await updateProject(projectToEditId, {
                name: projectName,
                description: description,
                contactId: selectedContactId,
            });
            toast({ title: 'Project Updated', description: `"${projectName}" has been updated.` });
            router.push('/projects/all');
        } else {
            const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
            const newProject = await addProject({
                name: projectName,
                description: description,
                status: 'planning',
                userId: user.uid,
                createdAt: new Date(),
                contactId: selectedContactId,
                steps: selectedTemplate ? selectedTemplate.steps : [],
            });
            toast({ title: 'Project Created', description: `"${projectName}" has been added.` });
            router.push(`/project-plan?projectId=${newProject.id}`);
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    } finally {
        setIsSaving(false);
    }
  };

  const handleEditTemplate = (template: ProjectTemplate) => {
    setTemplateToEdit(template);
    setNewTemplateName(template.name);
    setNewTemplateDescription(template.description || '');
    setIsTemplateFormOpen(true);
  };

  const handleDeleteTemplate = (template: ProjectTemplate) => {
    setTemplateToDelete(template);
  };
  
  const handleSaveTemplate = async () => {
    if (!user || !newTemplateName.trim()) return;
    if (!templateToEdit) return;

    try {
      const updatedData = { name: newTemplateName.trim(), description: newTemplateDescription.trim() };
      await updateProjectTemplate(templateToEdit.id, updatedData);
      setTemplates(prev => prev.map(t => t.id === templateToEdit.id ? { ...t, ...updatedData } : t));
      toast({ title: 'Template Updated' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    } finally {
      setIsTemplateFormOpen(false);
    }
  };

  const handleConfirmDeleteTemplate = async () => {
    if (!templateToDelete) return;
    try {
      await deleteProjectTemplate(templateToDelete.id);
      setTemplates(prev => prev.filter(t => t.id !== templateToDelete.id));
      toast({ title: 'Template Deleted', variant: 'destructive' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
    } finally {
      setTemplateToDelete(null);
    }
  };

  const selectedContact = contacts.find(c => c.id === selectedContactId);

  return (
    <>
      <div className="p-6 h-full flex flex-col items-center">
        <header className="relative text-center mb-4 w-full max-w-lg">
          <h1 className="text-3xl font-bold font-headline text-primary">
            {creationStep === 'choice' ? 'Create Your Project' : 'Project Details'}
          </h1>
          <div className="mt-4">
            <ProjectManagementHeader />
          </div>
          <div className="absolute top-0 right-0">
            <Button asChild variant="ghost" size="icon">
                <Link href="/projects/all" aria-label="Close">
                    <X className="h-5 w-5" />
                </Link>
            </Button>
          </div>
        </header>
        
        {creationStep === 'choice' ? (
            <div className="flex-1 w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-start pt-8 animate-in fade-in-50">
                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                            <FilePlus2 className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle>Start a Blank Project</CardTitle>
                        <CardDescription>Begin with a clean slate to build your project from the ground up.</CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button className="w-full" onClick={handleStartBlank}>Create Blank Project</Button>
                    </CardFooter>
                </Card>
                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                            <FileText className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle>Start from a Template</CardTitle>
                        <CardDescription>Select one of your saved project templates to get started quickly.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoadingData ? <div className="flex justify-center"><LoaderCircle className="h-6 w-6 animate-spin"/></div> : (
                            <div className="space-y-2">
                                {templates.length > 0 ? templates.map(template => (
                                  <div key={template.id} className="group flex items-center gap-1">
                                    <Button variant="outline" className="w-full justify-start flex-1" onClick={() => handleSelectTemplate(template)}>
                                        {template.name}
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-9 w-9">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onSelect={() => handleEditTemplate(template)}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => handleDeleteTemplate(template)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                )) : <p className="text-center text-sm text-muted-foreground">No templates found.</p>}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        ) : (
            <div className="w-full max-w-lg animate-in fade-in-50">
                <div className="flex justify-start mb-6">
                    <Button variant="outline" onClick={() => setCreationStep('choice')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Project List
                    </Button>
                </div>
                <div className="p-8 border-2 border-dashed rounded-lg">
                  <div className="space-y-4">
                      <div className="space-y-2">
                          <Label htmlFor="project-name">Project Name</Label>
                          <Input 
                              id="project-name" 
                              placeholder="Enter project name..." 
                              value={projectName}
                              onChange={(e) => setProjectName(e.target.value)}
                          />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                              id="description"
                              placeholder="Enter a brief description of the project..."
                              value={description}
                              onChange={e => setDescription(e.target.value)}
                          />
                      </div>
                       <div className="space-y-2">
                          <Label>Client (Optional)</Label>
                          <div className="flex gap-2">
                             <Popover open={isContactPopoverOpen} onOpenChange={setIsContactPopoverOpen}><PopoverTrigger asChild><Button variant="outline" role="combobox" className="w-full justify-between"><span className="truncate">{selectedContact?.name || "Select or search..."}</span><ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command><CommandInput placeholder="Search contacts..." /><CommandList><CommandEmpty>No contact found.</CommandEmpty><CommandGroup><CommandItem onSelect={() => { setSelectedContactId(null); setIsContactPopoverOpen(false); }}><Check className={cn("mr-2 h-4 w-4", !selectedContactId ? "opacity-100" : "opacity-0")} />-- No Client --</CommandItem>{contacts.map((contact) => ( <CommandItem key={contact.id} value={contact.name} onSelect={() => { setSelectedContactId(contact.id); setIsContactPopoverOpen(false); }}> <Check className={cn("mr-2 h-4 w-4", selectedContactId === contact.id ? "opacity-100" : "opacity-0")} />{contact.name}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent></Popover>
                            <Button type="button" variant="outline" onClick={() => setIsContactFormOpen(true)}><Plus className="mr-2 h-4 w-4" /> New</Button>
                        </div>
                      </div>
                      <div className="pt-4 flex justify-end">
                          <Button onClick={handleSave} disabled={isSaving}>
                              {isSaving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                              <Save className="mr-2 h-4 w-4" />
                              {projectToEditId ? 'Save Changes' : 'Save Project'}
                          </Button>
                      </div>
                  </div>
                </div>
            </div>
        )}
      </div>
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
       <Dialog open={isTemplateFormOpen} onOpenChange={setIsTemplateFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input id="template-name" value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-description">Description</Label>
              <Textarea id="template-description" value={newTemplateDescription} onChange={(e) => setNewTemplateDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsTemplateFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTemplate}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the template "{templateToDelete?.name}". This action cannot be undone.
            </AlertDialogDescription>
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