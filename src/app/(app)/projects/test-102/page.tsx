
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { LoaderCircle, Save, FolderPlus, ChevronsUpDown, Check, Plus, ArrowLeft, X, Info, Briefcase, ListTodo, Route, File, FileText } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getContacts, type Contact } from '@/services/contact-service';
import { getFolders as getContactFolders, type FolderData } from '@/services/contact-folder-service';
import { getCompanies, addCompany, type Company } from '@/services/accounting-service';
import { getIndustries, type Industry } from '@/services/industry-service';
import { addProject, getProjectTemplates, type Project, type ProjectStep, type ProjectTemplate } from '@/services/project-service';
import { cn } from '@/lib/utils';
import ContactFormDialog from '@/components/contacts/contact-form-dialog';
import type { Event as TaskEvent } from '@/types/calendar-types';


export default function CreateProjectPage() {
  const [creationStep, setCreationStep] = useState<'choice' | 'form'>('choice');
  
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactFolders, setContactFolders] = useState<FolderData[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customIndustries, setCustomIndustries] = useState<Industry[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [isContactPopoverOpen, setIsContactPopoverOpen] = useState(false);
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const loadData = useCallback(async () => {
    if (!user) {
        setIsLoadingData(false);
        return;
    };
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
    loadData();
  }, [loadData]);

  const handleContactSave = (savedContact: Contact, isEditing: boolean) => {
      if (isEditing) {
          setContacts(prev => prev.map(c => c.id === savedContact.id ? savedContact : c));
          if(selectedContactId === savedContact.id) {
            setSelectedContactId(savedContact.id); // Re-set to trigger any updates
          }
      } else {
          setContacts(prev => [...prev, savedContact]);
      }
      setSelectedContactId(savedContact.id);
      setIsContactFormOpen(false);
  };
  
  const handleSelectTemplate = (template: ProjectTemplate) => {
    setSelectedTemplate(template);
    setProjectName(template.name);
    setDescription(template.description);
    setCreationStep('form');
  };
  
  const handleStartBlank = () => {
    setSelectedTemplate(null);
    setProjectName('');
    setDescription('');
    setSelectedContactId(null);
    setCreationStep('form');
  };

  const handleSave = async () => {
    if (!user) {
        toast({ variant: "destructive", title: "Error", description: "You must be logged in to create a project." });
        return;
    }
    if (!projectName.trim()) {
        toast({ variant: "destructive", title: "Validation Error", description: "Project Name is required." });
        return;
    }

    setIsSaving(true);
    try {
        const newProject = await addProject({
            name: projectName,
            description: description,
            status: 'planning',
            userId: user.uid,
            createdAt: new Date(),
            projectManagerId: selectedContactId,
            steps: selectedTemplate ? selectedTemplate.steps : [],
        });
        toast({ title: 'Project Created', description: `"${projectName}" has been added.` });
        router.push(`/projects/${newProject.id}/tasks`);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    } finally {
        setIsSaving(false);
    }
  };
  
  const selectedContact = contacts.find(c => c.id === selectedContactId);

  return (
    <>
      <div className="p-6 h-full flex flex-col items-center">
        <header className="relative text-center mb-4 w-full max-w-lg">
            <div className="absolute top-0 right-0">
                <Button asChild variant="ghost" size="icon">
                    <Link href="/projects/all" aria-label="Close">
                        <X className="h-5 w-5" />
                    </Link>
                </Button>
            </div>
            <h1 className="text-3xl font-bold font-headline text-primary text-center">
                Create Your Project
            </h1>
        </header>
        
        {creationStep === 'choice' && (
            <div className="flex-1 w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-start pt-8 animate-in fade-in-50">
                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                            <FilePlus className="h-8 w-8 text-primary" />
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
                                    <Button key={template.id} variant="outline" className="w-full justify-start" onClick={() => handleSelectTemplate(template)}>
                                        {template.name}
                                    </Button>
                                )) : <p className="text-center text-sm text-muted-foreground">No templates found.</p>}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        )}
        
        {creationStep === 'form' && (
            <div className="w-full max-w-lg animate-in fade-in-50">
                <div className="flex justify-start mb-6">
                    <Button variant="outline" onClick={() => setCreationStep('choice')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Choices
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
                              onChange={(e) => setDescription(e.target.value)}
                          />
                      </div>
                       <div className="space-y-2">
                          <Label>Project Lead</Label>
                          <div className="flex gap-2">
                             <Popover open={isContactPopoverOpen} onOpenChange={setIsContactPopoverOpen}><PopoverTrigger asChild><Button variant="outline" role="combobox" className="w-full justify-between"><span className="truncate">{selectedContact?.name || "Select or search..."}</span><ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command><CommandInput placeholder="Search contacts..." /><CommandList><CommandEmpty>No contact found.</CommandEmpty><CommandGroup>{contacts.map((contact) => ( <CommandItem key={contact.id} value={contact.name} onSelect={() => { setSelectedContactId(contact.id); setIsContactPopoverOpen(false); }}> <Check className={cn("mr-2 h-4 w-4", selectedContactId === contact.id ? "opacity-100" : "opacity-0")} />{contact.name}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent></Popover>
                            <Button type="button" variant="outline" onClick={() => setIsContactFormOpen(true)}><Plus className="mr-2 h-4 w-4" /> New</Button>
                        </div>
                      </div>
                      <div className="pt-4 flex justify-end">
                          <Button onClick={handleSave} disabled={isSaving}>
                              {isSaving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                              <Save className="mr-2 h-4 w-4" />
                              Save Project
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
    </>
  );
}
