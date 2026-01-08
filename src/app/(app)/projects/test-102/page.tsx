
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LoaderCircle, Save, Plus, ChevronsUpDown, Check, Info, Briefcase, ListTodo, Route, ListChecks } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { addProject } from '@/services/project-service';
import { getContacts, addContact, type Contact } from '@/services/contact-service';
import { getFolders as getContactFolders, type FolderData } from '@/services/contact-folder-service';
import { getCompanies, addCompany, type Company } from '@/services/accounting-service';
import { getIndustries, type Industry } from '@/services/industry-service';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import ContactFormDialog from '@/components/contacts/contact-form-dialog';
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


export default function CreateProjectPage() {
  const [projectName, setProjectName] = useState('');
  const [testInfo, setTestInfo] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactFolders, setContactFolders] = useState<FolderData[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customIndustries, setCustomIndustries] = useState<Industry[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [isContactPopoverOpen, setIsContactPopoverOpen] = useState(false);
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);


  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const loadDropdownData = useCallback(async () => {
    if (!user) {
        setIsLoadingData(false);
        return;
    };
    try {
        const [foldersData, companiesData, industriesData, contactsData] = await Promise.all([
            getContactFolders(user.uid),
            getCompanies(user.uid),
            getIndustries(user.uid),
            getContacts(user.uid),
        ]);
        setContactFolders(foldersData);
        setCompanies(companiesData);
        setCustomIndustries(industriesData);
        setContacts(contactsData);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load necessary data.' });
    } finally {
        setIsLoadingData(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadDropdownData();
  }, [loadDropdownData]);

  const handleContactSave = (savedContact: Contact, isEditing: boolean) => {
      if (isEditing) {
          setContacts(prev => prev.map(c => c.id === savedContact.id ? savedContact : c));
          if(selectedContactId === savedContact.id) {
            setSelectedContactId(savedContact.id); // Re-set to trigger any updates
          }
      } else {
          setContacts(prev => [...prev, savedContact]);
      }
      setSelectedContactId(savedContact.id); // Select the new or updated contact
      setIsContactFormOpen(false);
  };


  const handleSave = async () => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to create a project.' });
        return;
    }
    if (!projectName.trim()) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Project Name is required.' });
        return;
    }

    setIsSaving(true);
    try {
        await addProject({
            name: projectName,
            description: '',
            status: 'planning',
            userId: user.uid,
            createdAt: new Date(),
            testPField: testInfo,
            projectManagerId: selectedContactId, // Saving the project lead
        });
        toast({ title: 'Project Created', description: `"${projectName}" has been added.` });
        router.push('/projects/all');
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    } finally {
        setIsSaving(false);
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
            <h1 className="text-3xl font-bold font-headline text-primary">
                Create Your Project
            </h1>
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
                  <Label htmlFor="test-info">Test info</Label>
                  <Input 
                      id="test-info" 
                      placeholder="Enter test info..."
                      value={testInfo}
                      onChange={(e) => setTestInfo(e.target.value)}
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
