
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  ArrowLeft,
  ChevronsUpDown,
  Check,
  LoaderCircle,
  Save,
  Link as LinkIcon,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getContacts, getFolders, addContact, type Contact, type FolderData } from '@/services/contact-service';
import { saveEmailForContact } from '@/services/file-service';
import { cn } from '@/lib/utils';
import ContactFormDialog from '@/components/contacts/contact-form-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function LogCommunicationPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sourceLink, setSourceLink] = useState('');
  
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);


  // Popover State
  const [isContactPopoverOpen, setIsContactPopoverOpen] = useState(false);

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
      const [fetchedContacts, fetchedFolders] = await Promise.all([
          getContacts(user.uid),
          getFolders(user.uid),
      ]);
      setContacts(fetchedContacts);
      setFolders(fetchedFolders);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to load contacts',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const resetForm = () => {
      setSelectedContactId(null);
      setFrom('');
      setSubject('');
      setBody('');
      setSourceLink('');
  }

  const handleSaveLog = async () => {
    if (!selectedContactId || !from.trim() || !subject.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description:
          'Please select a contact and enter "From" and "Subject" fields.',
      });
      return;
    }

    const contact = contacts.find(c => c.id === selectedContactId);
    if (!contact) {
         toast({ variant: 'destructive', title: 'Invalid Contact' });
         return;
    }

    setIsSaving(true);
    try {
      await saveEmailForContact(user!.uid, contact.name, {
        to: contact.name,
        from: from,
        subject: subject,
        body: body,
        sourceLink: sourceLink,
      });
      toast({
        title: 'Communication Logged',
        description: 'The email record has been saved.',
      });
      resetForm();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleContactSave = (savedContact: Contact, isEditing: boolean) => {
    if (isEditing) {
        setContacts(prev => prev.map(c => c.id === savedContact.id ? savedContact : c));
    } else {
        setContacts(prev => [...prev, savedContact]);
    }
    setSelectedContactId(savedContact.id);
    setFrom(savedContact.email || '');
    setIsContactFormOpen(false);
  };
  
  const handleLogTime = () => {
    const query = new URLSearchParams();
    if (subject) query.append('title', subject);
    if (body) query.append('notes', body);
    if (selectedContactId) query.append('contactId', selectedContactId);
    if (selectedProjectId) query.append('projectId', selectedProjectId); // Assuming selectedProjectId state exists
    
    router.push(`/master-mind?${query.toString()}`);
  };


  const selectedContact = contacts.find(c => c.id === selectedContactId);
  const selectedProjectId = 'project-placeholder'; // Placeholder for project selection if added later

  return (
    <>
      <div className="p-4 sm:p-6 flex flex-col h-full">
        <header className="relative text-center mb-6 w-full">
          <Button asChild variant="outline" className="absolute left-0 top-1/2 -translate-y-1/2">
            <Link href="/ogeemail">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Hub
            </Link>
          </Button>
          <h1 className="text-3xl font-bold font-headline text-primary">
            Log Communication
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Copy and paste an email to create a permanent record for a contact.
          </p>
        </header>

        <Card className="w-full flex-1 flex flex-col">
          <CardHeader>
            <CardTitle>Log an Email</CardTitle>
            <CardDescription>
              This information will be saved as a document in the contact's
              folder within the File Manager.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1 flex flex-col">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Name</Label>
                  <div className="flex items-center gap-2">
                    <Popover
                      open={isContactPopoverOpen}
                      onOpenChange={setIsContactPopoverOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between"
                          disabled={isLoading}
                        >
                          {selectedContact?.name || 'Select a contact...'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Search contacts..." />
                          <CommandList>
                            <CommandEmpty>
                              {isLoading ? (
                                <div className="flex justify-center p-2"><LoaderCircle className="h-4 w-4 animate-spin" /></div>
                              ) : (
                                'No client found.'
                              )}
                            </CommandEmpty>
                            <CommandGroup>
                              {contacts.map((c) => (
                                <CommandItem
                                  key={c.id}
                                  value={c.name}
                                  onSelect={() => {
                                    setSelectedContactId(c.id);
                                    setFrom(c.email || '');
                                    setIsContactPopoverOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      selectedContactId === c.id
                                        ? 'opacity-100'
                                        : 'opacity-0'
                                    )}
                                  />
                                  {c.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                     <Button type="button" onClick={() => setIsContactFormOpen(true)}>Add New</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="from">Contact Email Address</Label>
                  <Input
                    id="from"
                    placeholder="sender@example.com"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="Email subject line"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Create link to Source Email</Label>
                  <Button variant="outline" className="w-full justify-start" onClick={() => setIsLinkDialogOpen(true)}>
                    <LinkIcon className="mr-2 h-4 w-4" />
                    {sourceLink ? "Edit link to Source Email" : "Create link to Source Email"}
                    {sourceLink && <Check className="ml-auto h-4 w-4 text-green-500" />}
                  </Button>
                </div>
            </div>
            <div className="space-y-2 flex-1 flex flex-col">
              <Label htmlFor="body">Body</Label>
              <Textarea
                id="body"
                placeholder="Paste the email body here..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="flex-1"
              />
            </div>
          </CardContent>
          <CardFooter className="justify-between">
             <Button onClick={handleLogTime}>
              <Clock className="mr-2 h-4 w-4" />
              Log Time & Schedule
            </Button>
            <Button onClick={handleSaveLog} disabled={isSaving}>
              {isSaving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              Save Log
            </Button>
          </CardFooter>
        </Card>
      </div>

       <ContactFormDialog
        isOpen={isContactFormOpen}
        onOpenChange={setIsContactFormOpen}
        contactToEdit={null}
        folders={folders}
        onSave={handleContactSave}
      />
      
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Link to Source Email</DialogTitle>
                <DialogDescription>
                    Go to the specific email in your client (e.g., Gmail), copy its unique URL from the address bar, and paste it below.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Label htmlFor="source-link-input">Email URL</Label>
                <Input 
                    id="source-link-input"
                    value={sourceLink}
                    onChange={(e) => setSourceLink(e.target.value)}
                    placeholder="https://mail.google.com/mail/u/0/#inbox/..."
                />
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsLinkDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => setIsLinkDialogOpen(false)}>Save</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
