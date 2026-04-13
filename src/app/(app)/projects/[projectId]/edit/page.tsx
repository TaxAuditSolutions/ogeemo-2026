
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  ChevronsUpDown,
  Check,
  Plus,
  LoaderCircle,
  Save,
  X,
} from 'lucide-react';
import {
  getProjectById,
  updateProject,
  type Project,
} from '@/services/project-service';
import { getContacts, type Contact } from '@/services/contact-service';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import ContactFormDialog from '@/components/contacts/contact-form-dialog';
import { getFolders as getContactFolders, type FolderData } from '@/services/contact-folder-service';
import { getCompanies, type Company } from '@/core/accounting-service';
import { getIndustries, type Industry } from '@/services/industry-service';

const projectSchema = {
  name: '',
  description: '',
  contactId: null,
};

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  
  const projectId = params.projectId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isContactPopoverOpen, setIsContactPopoverOpen] = useState(false);
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);

  // Data for the contact form dialog
  const [contactFolders, setContactFolders] = useState<FolderData[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customIndustries, setCustomIndustries] = useState<Industry[]>([]);

  const loadDataForContactDialog = useCallback(async () => {
    if (!user) return;
    try {
        const [foldersData, companiesData, industriesData] = await Promise.all([
            getContactFolders(user.uid),
            getCompanies(user.uid),
            getIndustries(user.uid),
        ]);
        setContactFolders(foldersData);
        setCompanies(companiesData);
        setCustomIndustries(industriesData);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load support data for contacts.' });
    }
  }, [user, toast]);

  const loadProjectAndContacts = useCallback(async () => {
    if (isAuthLoading || !user || !projectId) {
      if (!isAuthLoading && projectId) {
        setIsLoading(false);
      }
      return;
    }
    
    setIsLoading(true);
    try {
      const [projectData, contactsData] = await Promise.all([
        getProjectById(projectId),
        getContacts(user.uid),
      ]);
      
      setContacts(contactsData);
      
      if (projectData) {
        setProjectName(projectData.name);
        setDescription(projectData.description || '');
        setSelectedContactId(projectData.contactId || null);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not find the project to edit.' });
        router.push('/projects/all');
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load project data.' });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, user, isAuthLoading, router, toast]);

  useEffect(() => {
    loadProjectAndContacts();
    loadDataForContactDialog();
  }, [loadProjectAndContacts, loadDataForContactDialog]);

  const handleSave = async () => {
    if (!projectName.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Project Name is required." });
      return;
    }

    setIsSaving(true);
    try {
        await updateProject(projectId, {
            name: projectName,
            description: description,
            contactId: selectedContactId,
        });
        toast({ title: 'Project Updated', description: `"${projectName}" has been updated.` });
        router.push('/projects/all');
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    } finally {
        setIsSaving(false);
    }
  };

  const handleContactSave = (savedContact: Contact, isEditing: boolean) => {
      setContacts(prev => {
          const existing = prev.find(c => c.id === savedContact.id);
          if (existing) {
              return prev.map(c => c.id === savedContact.id ? savedContact : c);
          }
          return [...prev, savedContact];
      });
      setSelectedContactId(savedContact.id);
      setIsContactFormOpen(false);
  };
  
  const selectedContact = contacts.find(c => c.id === selectedContactId);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4">
        <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="p-6 h-full flex flex-col items-center">
        <header className="w-full max-w-lg text-center relative mb-6">
            <h1 className="text-2xl font-bold font-headline text-primary">Edit Project Details</h1>
            <div className="absolute top-0 right-0">
                <Button asChild variant="ghost" size="icon">
                    <Link href="/projects/all" aria-label="Close">
                        <X className="h-5 w-5" />
                    </Link>
                </Button>
            </div>
        </header>

        <div className="p-8 border-2 border-dashed rounded-lg w-full max-w-lg">
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
            <div className="pt-4 flex justify-between">
                <Button variant="outline" asChild>
                    <Link href="/projects/all">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Cancel
                    </Link>
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
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
