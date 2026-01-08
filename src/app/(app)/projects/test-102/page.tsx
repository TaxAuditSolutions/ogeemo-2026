
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LoaderCircle, ArrowLeft, X, Briefcase, ListTodo, Route, Info, Check, ChevronsUpDown, Plus, Save } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getContacts, type Contact } from '@/services/contact-service';
import { getFolders as getContactFolders, type FolderData } from '@/services/contact-folder-service';
import { getCompanies, addCompany, type Company } from '@/services/accounting-service';
import { getIndustries, type Industry } from '@/services/industry-service';
import { addProject, getProjectTemplates, type ProjectStep, type ProjectTemplate } from '@/services/project-service';
import ContactFormDialog from '@/components/contacts/contact-form-dialog';
import { cn } from '@/lib/utils';


export default function CreateProjectPage() {
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
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

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
        let templateSteps: Partial<ProjectStep>[] = [];
        if (selectedTemplateId) {
            const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
            if (selectedTemplate) {
                templateSteps = selectedTemplate.steps.map(step => ({...step, id: `step_${Date.now()}_${Math.random()}`}));
            }
        }

        await addProject({
            name: projectName,
            description: description,
            status: 'planning',
            userId: user.uid,
            createdAt: new Date(),
            projectManagerId: selectedContactId,
            steps: templateSteps,
        });
        toast({ title: 'Project Created', description: `"${projectName}" has been added.` });
        router.push('/projects/all');
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    } finally {
        setIsSaving(false);
    }
  };

  const handleCreateCompany = async (companyName: string) => {
    if (!user || !companyName.trim()) return;
    try {
        const newCompany = await addCompany({ name: companyName.trim(), userId: user.uid });
        onCompaniesChange([...companies, newCompany]);
        // Also update contact's company name if needed
        const contact = contacts.find(c => c.id === selectedContactId);
        if(contact) {
            updateContact(contact.id, { businessName: newCompany.name });
            setContacts(prev => prev.map(c => c.id === contact.id ? {...c, businessName: newCompany.name} : c));
        }
        toast({ title: 'Company Created', description: `"${companyName.trim()}" has been added.` });
    } catch (error: any) {
         toast({ variant: 'destructive', title: 'Failed to create company', description: error.message });
    }
  };
  
  const selectedContact = contacts.find(c => c.id === selectedContactId);

  return (
    <>
      <div className="p-6">
        <header className="relative text-center mb-4">
            <div className="absolute left-0 top-1/2 -translate-y-1/2">
                <Button asChild variant="outline">
                    <Link href="/projects/all">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Project List
                    </Link>
                </Button>
            </div>
            <h1 className="text-3xl font-bold font-headline text-primary text-center">
                Create Your Project
            </h1>
             <div className="absolute top-0 right-0">
                <Button asChild variant="ghost" size="icon">
                    <Link href="/action-manager" aria-label="Close">
                        <X className="h-5 w-5" />
                    </Link>
                </Button>
            </div>
        </header>
        <div className="text-center mb-6">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="link" className="text-muted-foreground">
                <Info className="mr-2 h-4 w-4" />
                How does Project Management work in Ogeemo?
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Project Management Workflow</DialogTitle>
                <DialogDescription>A quick guide to turning your ideas into actionable projects.</DialogDescription>
              </DialogHeader>
              <Accordion type="single" collapsible defaultValue="item-1">
                <AccordionItem value="item-1">
                  <AccordionTrigger>1. Create Your Project</AccordionTrigger>
                  <AccordionContent>Start here by giving your project a name and assigning a lead. This creates the main container for all your tasks and planning.</AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>2. Plan Your Project</AccordionTrigger>
                  <AccordionContent>Use the "Project Planner" to break down your project into manageable steps. This creates a reusable template for similar projects in the future.</AccordionContent>
                </AccordionItem>
                 <AccordionItem value="item-3">
                  <AccordionTrigger>3. Manage Your Tasks</AccordionTrigger>
                  <AccordionContent>Each step in your plan automatically becomes a task on the project's "Task Board," where you can track progress from "To Do" to "Done."</AccordionContent>
                </AccordionItem>
                 <AccordionItem value="item-4" className="border-b-0">
                  <AccordionTrigger>4. Visualize Overall Status</AccordionTrigger>
                  <AccordionContent>Use the "Project Status Board" to see the big picture. Drag and drop entire projects between statuses like 'Planning', 'Active', and 'Completed' to keep your workload organized.</AccordionContent>
                </AccordionItem>
              </Accordion>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button">Close</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="p-8 border-2 border-dashed rounded-lg max-w-lg mx-auto">
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
                     <Popover open={isContactPopoverOpen} onOpenChange={setIsContactPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" className="w-full justify-between">
                                <span className="truncate">{selectedContact?.name || "Select or search..."}</span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput placeholder="Search contacts..." />
                                <CommandList>
                                    <CommandEmpty>No contact found.</CommandEmpty>
                                    <CommandGroup>
                                        {contacts.map((contact) => (
                                        <CommandItem key={contact.id} value={contact.name} onSelect={() => { setSelectedContactId(contact.id); setIsContactPopoverOpen(false); }}>
                                            <Check className={cn("mr-2 h-4 w-4", selectedContactId === contact.id ? "opacity-100" : "opacity-0")} />
                                            {contact.name}
                                        </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    <Button type="button" variant="outline" onClick={() => setIsContactFormOpen(true)}><Plus className="mr-2 h-4 w-4" /> New</Button>
                </div>
              </div>
               <div className="space-y-2">
                  <Label>Start from a Template (Optional)</Label>
                  <Select
                    value={selectedTemplateId}
                    onValueChange={(value) => {
                      setSelectedTemplateId(value === 'no-template' ? '' : value);
                    }}
                  >
                    <SelectTrigger>
                        <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="no-template">None</SelectItem>
                        {templates.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
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

