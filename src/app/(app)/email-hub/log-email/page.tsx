
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
  Calendar as CalendarIcon,
  Edit,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getContacts, type FolderData, getFolders as getContactFolders } from '@/services/contact-service';
import { saveEmailForContact } from '@/services/file-service';
import { cn } from '@/lib/utils';
import ContactFormDialog from '@/components/contacts/contact-form-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Contact } from '@/data/contacts';
import { getCompanies, addCompany, type Company } from '@/services/accounting-service';
import { getIndustries, type Industry } from '@/services/industry-service';
import { format, set } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function LogEmailPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactFolders, setContactFolders] = useState<FolderData[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customIndustries, setCustomIndustries] = useState<Industry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [contactToEdit, setContactToEdit] = useState<Contact | null>(null);
  const [from, setFrom] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sourceLink, setSourceLink] = useState('');
  
  // Date/Time State
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [startHour, setStartHour] = useState<string>(String(new Date().getHours()));
  const [startMinute, setStartMinute] = useState<string>(String(Math.floor(new Date().getMinutes() / 5) * 5));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [endHour, setEndHour] = useState<string>(String(new Date().getHours() + 1));
  const [endMinute, setEndMinute] = useState<string>(String(Math.floor(new Date().getMinutes() / 5) * 5));
  
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isContactPopoverOpen, setIsContactPopoverOpen] = useState(false);
  const [isStartPopoverOpen, setIsStartPopoverOpen] = useState(false);
  const [isEndPopoverOpen, setIsEndPopoverOpen] = useState(false);


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
      const [fetchedContacts, fetchedFolders, fetchedCompanies, fetchedIndustries] = await Promise.all([
        getContacts(user.uid),
        getContactFolders(user.uid),
        getCompanies(user.uid),
        getIndustries(user.uid),
      ]);
      setContacts(fetchedContacts);
      setContactFolders(fetchedFolders);
      setCompanies(fetchedCompanies);
      setCustomIndustries(fetchedIndustries);
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

  const saveEmailToFile = async (): Promise<{ success: boolean, fileId?: string, folderId?: string }> => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not logged in' });
      return { success: false };
    }
    if (!selectedContactId || !from.trim() || !subject.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please select a contact and enter "From" and "Subject" fields.',
      });
      return { success: false };
    }

    const contact = contacts.find(c => c.id === selectedContactId);
    if (!contact) {
      toast({ variant: 'destructive', title: 'Invalid Contact' });
      return { success: false };
    }

    setIsSaving(true);
    try {
      const savedFile = await saveEmailForContact(user.uid, contact.name, {
        to: contact.name,
        from: from,
        subject: subject,
        body: body,
        sourceLink: sourceLink,
      });
      toast({
        title: 'Email Logged',
        description: `The email record has been saved to the "${contact.name}" folder in your Document Manager.`,
        action: (
            <Button variant="link" asChild>
                <Link href={`/document-manager?folderId=${savedFile.folderId}`}>
                    View File
                </Link>
            </Button>
        )
      });
      return { success: true, fileId: savedFile.id, folderId: savedFile.folderId };
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
      return { success: false };
    } finally {
      setIsSaving(false);
    }
  };


  const handleLogTime = async () => {
    const saveResult = await saveEmailToFile();
    if (!saveResult.success) {
        return; // Stop if saving the file fails
    }
    
    const query = new URLSearchParams();
    if (subject) query.append('title', subject);
    if (body) query.append('notes', body);
    if (selectedContactId) query.append('contactId', selectedContactId);

    if (startDate) {
        const finalStartDate = set(startDate, { hours: parseInt(startHour), minutes: parseInt(startMinute) });
        query.append('start', finalStartDate.toISOString());

        let finalEndDate: Date;
        const finalEndDateDatePart = endDate || finalStartDate;
        const finalEndHour = endHour || startHour;
        const finalEndMinute = endMinute || startMinute;
        finalEndDate = set(finalEndDateDatePart, { hours: parseInt(finalEndHour), minutes: parseInt(finalEndMinute) });

        if (finalEndDate <= finalStartDate) {
            finalEndDate = new Date(finalStartDate.getTime() + 30 * 60000); // Default to 30 min duration
        }
        query.append('end', finalEndDate.toISOString());
    }
    
    router.push(`/master-mind?${query.toString()}`);
  };

  const handleSaveLog = async () => {
    const saveResult = await saveEmailToFile();
    if (saveResult.success) {
      resetForm();
    }
  };

  const handleContactSave = (savedContact: Contact, isEditing: boolean) => {
    if (isEditing) {
        setContacts(prev => prev.map(c => c.id === savedContact.id ? savedContact : c));
        if (selectedContactId === savedContact.id) {
          setFrom(savedContact.email || '');
        }
    } else {
        setContacts(prev => [...prev, savedContact]);
    }
    setSelectedContactId(savedContact.id);
    setIsContactFormOpen(false);
    setContactToEdit(null);
  };
  
  const handleEditContact = () => {
    if (selectedContactId) {
      const contact = contacts.find(c => c.id === selectedContactId);
      if (contact) {
        setContactToEdit(contact);
        setIsContactFormOpen(true);
      }
    }
  };

  const hourOptions = Array.from({ length: 24 }, (_, i) => {
    const d = set(new Date(), { hours: i });
    return { value: String(i), label: format(d, 'h a') };
  });

  const minuteOptions = Array.from({ length: 12 }, (_, i) => {
    const minutes = i * 5;
    return { value: String(minutes), label: `:${minutes.toString().padStart(2, '0')}` };
  });


  const selectedContact = contacts.find(c => c.id === selectedContactId);

  return (
    <>
      <div className="p-4 sm:p-6 flex flex-col h-full">
        <header className="relative text-center mb-6 w-full">
          <Button asChild variant="outline" className="absolute left-0 top-1/2 -translate-y-1/2">
            <Link href="/email-hub">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Hub
            </Link>
          </Button>
          <h1 className="text-3xl font-bold font-headline text-primary">
            Log an Email
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Copy and paste an email to create a permanent record for a contact. To save the log to the calendar, you must click the button called Log time &amp; Schedule. To save to the client folder click the save log button
          </p>
        </header>

        <Card className="w-full flex-1 flex flex-col">
          <CardHeader>
            <CardTitle>Email Details</CardTitle>
            <CardDescription>
              This information will be saved as a document in the contact's
              folder within the Document Manager.
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
                     <Button type="button" variant="outline" size="icon" onClick={() => { setContactToEdit(null); setIsContactFormOpen(true); }}><Plus className="h-4 w-4"/></Button>
                     <Button type="button" variant="outline" size="icon" onClick={handleEditContact} disabled={!selectedContactId}><Edit className="h-4 w-4"/></Button>
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
             <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Scheduling (Optional)</CardTitle>
                <CardDescription>Schedule this email as a task or event on your calendar.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <Label>Start Time</Label>
                       <Popover open={isStartPopoverOpen} onOpenChange={setIsStartPopoverOpen}>
                          <PopoverTrigger asChild>
                              <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {startDate ? format(startDate, "PPP") : <span>Pick a start date</span>}
                              </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={startDate} onSelect={(date) => { setStartDate(date); setIsStartPopoverOpen(false); }} initialFocus /></PopoverContent>
                      </Popover>
                      <div className="flex-1 flex gap-2">
                          <Select value={startHour} onValueChange={setStartHour}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{hourOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
                          <Select value={startMinute} onValueChange={setStartMinute}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{minuteOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
                      </div>
                  </div>
                   <div className="space-y-2">
                      <Label>End Time</Label>
                       <Popover open={isEndPopoverOpen} onOpenChange={setIsEndPopoverOpen}>
                          <PopoverTrigger asChild>
                              <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {endDate ? format(endDate, "PPP") : <span>Pick an end date</span>}
                              </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={endDate} onSelect={(date) => { setEndDate(date); setIsEndPopoverOpen(false); }} initialFocus /></PopoverContent>
                      </Popover>
                      <div className="flex-1 flex gap-2">
                          <Select value={endHour} onValueChange={setEndHour}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{hourOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
                          <Select value={endMinute} onValueChange={setEndMinute}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{minuteOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
                      </div>
                  </div>
              </CardContent>
            </Card>
          </CardContent>
          <CardFooter className="justify-between">
             <Button onClick={handleLogTime}>
              <Clock className="mr-2 h-4 w-4" />
              Log Time &amp; Schedule
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
        contactToEdit={contactToEdit}
        folders={contactFolders}
        onFoldersChange={setContactFolders}
        onSave={handleContactSave}
        companies={companies}
        onCompaniesChange={setCompanies}
        customIndustries={customIndustries}
        onCustomIndustriesChange={setCustomIndustries}
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
