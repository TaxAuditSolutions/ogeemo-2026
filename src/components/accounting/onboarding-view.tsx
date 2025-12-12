
'use client';

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  UserPlus,
  LoaderCircle,
  ChevronsUpDown,
  Check,
  ArrowRight,
  Briefcase,
  ListTodo,
  Pencil,
} from "lucide-react";
import { AccountingPageHeader } from "@/components/accounting/page-header";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { getContacts, addContact, type Contact } from '@/services/contact-service';
import { getFolders as getContactFolders, type FolderData } from '@/services/contact-folder-service';
import { addProject, type Project, type Event as TaskEvent } from '@/services/project-service';
import ContactFormDialog from "../contacts/contact-form-dialog";
import { NewTaskDialog } from '../tasks/NewTaskDialog';
import { getCompanies, type Company } from "@/services/accounting-service";
import { getIndustries, type Industry } from "@/services/industry-service";
import { Label } from "@/components/ui/label";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

const PRESELECTED_CONTACT_ID_KEY = 'ogeemo-preselected-contact-id';

export function OnboardingView() {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [folders, setFolders] = useState<FolderData[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [customIndustries, setCustomIndustries] = useState<Industry[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [isNewContactDialogOpen, setIsNewContactDialogOpen] = useState(false);
    const [contactToEdit, setContactToEdit] = useState<Contact | null>(null);
    const [isContactPopoverOpen, setIsContactPopoverOpen] = useState(false);
    
    const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
    const [initialDialogData, setInitialDialogData] = useState({});

    const loadData = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const [fetchedContacts, fetchedFolders, fetchedCompanies, fetchedIndustries] = await Promise.all([
                getContacts(user.uid),
                getContactFolders(user.uid),
                getCompanies(user.uid),
                getIndustries(user.uid)
            ]);
            setContacts(fetchedContacts);
            setFolders(fetchedFolders);
            setCompanies(fetchedCompanies);
            setCustomIndustries(fetchedIndustries);
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Failed to load data", description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const handleContactSave = (savedContact: Contact, isEditing: boolean) => {
        if (isEditing) {
            setContacts(prev => prev.map(c => c.id === savedContact.id ? savedContact : c));
            if (selectedContact?.id === savedContact.id) {
                setSelectedContact(savedContact);
            }
        } else {
            setContacts(prev => [...prev, savedContact]);
            setSelectedContact(savedContact);
        }
        setIsNewContactDialogOpen(false);
    };
    
    const handleNewContactClick = () => {
        setContactToEdit(null);
        setIsNewContactDialogOpen(true);
    };

    const handleEditContactClick = () => {
        if (selectedContact) {
            setContactToEdit(selectedContact);
            setIsNewContactDialogOpen(true);
        }
    };

    const handleMakeProject = () => {
        if (!selectedContact) return;
        setInitialDialogData({ contactId: selectedContact.id });
        setIsNewProjectDialogOpen(true);
    };

    const handleProjectCreated = async (projectData: Omit<Project, 'id' | 'createdAt' | 'userId'>, tasks: Omit<TaskEvent, 'id' | 'userId' | 'projectId'>[]) => {
        if (!user) return;
        try {
            const newProject = await addProject({ ...projectData, status: 'planning', userId: user.uid, createdAt: new Date() });
            toast({ title: "Project Created", description: `"${newProject.name}" has been successfully created.` });
            router.push(`/projects/${newProject.id}/tasks`);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Failed to create project", description: error.message });
        }
    };
    
    const handleCreateTask = () => {
        if (!selectedContact) return;
        sessionStorage.setItem(PRESELECTED_CONTACT_ID_KEY, selectedContact.id);
        router.push('/master-mind');
    };


    if (isLoading) {
        return <div className="flex h-full w-full items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <>
            <div className="p-4 sm:p-6 space-y-6">
                <AccountingPageHeader pageTitle="Client Onboarding" />
                <div className="flex flex-col items-center">
                    <header className="text-center mb-6 max-w-4xl">
                        <h1 className="text-3xl font-bold font-headline text-primary">
                        Client Onboarding
                        </h1>
                        <p className="text-muted-foreground">
                        A streamlined process to get your clients set up quickly and accurately.
                        </p>
                    </header>
                    
                    <Card className="w-full max-w-2xl">
                        <CardHeader>
                            <CardTitle>Step 1: Select a Client</CardTitle>
                            <CardDescription>
                                Choose an existing client or create a new one to begin the onboarding process.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Existing Client</Label>
                                <Popover open={isContactPopoverOpen} onOpenChange={setIsContactPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" className="w-full justify-between">
                                            <Users className="mr-2 h-4 w-4" />
                                            <span className="truncate">{selectedContact?.name || "Select client..."}</span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search clients..." />
                                            <CommandList>
                                                <CommandEmpty>No client found.</CommandEmpty>
                                                <CommandGroup>
                                                    {contacts.map(c => (
                                                        <CommandItem key={c.id} value={c.name} onSelect={() => { setSelectedContact(c); setIsContactPopoverOpen(false); }}>
                                                            <Check className={cn("mr-2 h-4 w-4", selectedContact?.id === c.id ? "opacity-100" : "opacity-0")} />
                                                            {c.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label>New Client</Label>
                                <Button variant="outline" className="w-full justify-start" onClick={handleNewContactClick}>
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Create New Client
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {selectedContact && (
                         <Card className="w-full max-w-4xl mt-6 animate-in fade-in-50">
                            <CardHeader>
                                <CardTitle>Step 2: Client Setup Guide for {selectedContact.name}</CardTitle>
                                <CardDescription>
                                    Now that your client is selected, what would you like to do next?
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <Card className="flex flex-col">
                                    <CardHeader>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary/10 rounded-lg">
                                                <Pencil className="h-5 w-5 text-primary" />
                                            </div>
                                            <CardTitle className="text-base">View / Edit Client Details</CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-1">
                                        <p className="text-sm text-muted-foreground">Review or update this client's contact information.</p>
                                    </CardContent>
                                    <CardFooter>
                                        <Button className="w-full" onClick={handleEditContactClick}>
                                            View / Edit <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </CardFooter>
                                </Card>
                                <Card className="flex flex-col">
                                    <CardHeader>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary/10 rounded-lg"><ListTodo className="h-5 w-5 text-primary" /></div>
                                            <CardTitle className="text-base">Create a Task</CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-1"><p className="text-sm text-muted-foreground">Create a single task, meeting, or event for this client.</p></CardContent>
                                    <CardFooter><Button className="w-full" onClick={handleCreateTask}>Go <ArrowRight className="ml-2 h-4 w-4" /></Button></CardFooter>
                                </Card>
                                <Card className="flex flex-col">
                                    <CardHeader>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary/10 rounded-lg"><Briefcase className="h-5 w-5 text-primary" /></div>
                                            <CardTitle className="text-base">Create a Project</CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-1"><p className="text-sm text-muted-foreground">Start a new multi-step project for this client.</p></CardContent>
                                    <CardFooter><Button className="w-full" onClick={handleMakeProject}>Go <ArrowRight className="ml-2 h-4 w-4" /></Button></CardFooter>
                                </Card>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            <ContactFormDialog
                isOpen={isNewContactDialogOpen}
                onOpenChange={setIsNewContactDialogOpen}
                contactToEdit={contactToEdit}
                folders={folders}
                onFoldersChange={setFolders}
                onSave={handleContactSave}
                companies={companies}
                onCompaniesChange={setCompanies}
                customIndustries={customIndustries}
                onCustomIndustriesChange={setCustomIndustries}
            />

            <NewTaskDialog
                isOpen={isNewProjectDialogOpen}
                onOpenChange={setIsNewProjectDialogOpen}
                onProjectCreate={handleProjectCreated}
                contacts={contacts}
                onContactsChange={setContacts}
                projectToEdit={null}
                initialData={initialDialogData}
            />
        </>
    );
}
