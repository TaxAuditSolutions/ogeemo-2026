
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
  Info,
  Contact,
  Folder,
  Briefcase,
  FileDigit,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getContacts, type Contact as ContactType } from '@/services/contact-service';
import { getFolders as getContactFolders, type FolderData } from '@/services/contact-folder-service';
import { saveEmailForContact } from '@/services/file-service';
import { cn } from '@/lib/utils';
import ContactFormDialog from '@/components/contacts/contact-form-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getCompanies, addCompany, type Company } from '@/services/accounting-service';
import { getIndustries, type Industry } from '@/services/industry-service';
import { format, set } from 'date-fns';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function LogEmailPage() {
  const [contacts, setContacts] = useState<ContactType[]>([]);
  const [contactFolders, setContactFolders] = useState<FolderData[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customIndustries, setCustomIndustries] = useState<Industry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [contactToEdit, setContactToEdit] = useState<ContactType | null>(null);
  const [from, setFrom] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sourceLink, setSourceLink] = useState('');
  
  // Date/Time State
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [startHour, setStartHour] = useState<string>(String(new Date().getHours()).padStart(2, '0'));
  const [startMinute, setStartMinute] = useState<string>(String(Math.floor(new Date().getMinutes() / 5) * 5).padStart(2, '0'));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [endHour, setEndHour] = useState<string>(String(new Date().getHours() + 1).padStart(2, '0'));
  const [endMinute, setEndMinute] = useState<string>(String(Math.floor(new Date().getMinutes() / 5) * 5).padStart(2, '0'));
  
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isContactPopoverOpen, setIsContactPopoverOpen] = useState(false);
  const [isStartPopoverOpen, setIsStartPopoverOpen] = useState(false);
  const [isEndPopoverOpen, setIsEndPopoverOpen] = useState(false);
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);


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
      // Removing user.uid filter to ensure all contacts from Contact Hub are available
      const [fetchedContacts, fetchedFolders, fetchedCompanies, fetchedIndustries] = await Promise.all([
        getContacts(),
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
        title: 'Failed to load directory',
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
    if (!selectedContactId || !subject.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please select a contact and enter a subject.',
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
        return; 
    }
    
    const query = new URLSearchParams();
    query.append('source', 'log-email'); 
    if (subject) query.append('title', `Email: ${subject}`);
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
            finalEndDate = new Date(finalStartDate.getTime() + 30 * 60000); 
        }
        query.append('end', finalEndDate.toISOString());
    }
    
    toast({ title: 'Transferring to Master Mind', description: 'Redirecting to finalize orchestration.' });
    router.push(`/master-mind?${query.toString()}`);
  };

  const handleContactSave = (savedContact: ContactType, isEditing: boolean) => {
      if (isEditing) {
          setContacts(prev => prev.map(c => c.id === savedContact.id ? savedContact : c));
          if(selectedContactId === savedContact.id) {
            setSelectedContactId(savedContact.id);
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

  const selectedContact = contacts.find(c => c.id === selectedContactId);

  return (
    <>
      <div className="p-4 sm:p-6 flex flex-col h-full bg-muted/10">
        <header className="relative text-center mb-6 w-full">
          <Button asChild variant="outline" className="absolute left-0 top-1/2 -translate-y-1/2">
            <Link href="/email-hub">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Hub
            </Link>
          </Button>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-3xl font-bold font-headline text-primary">Schedule & Bill Email Activity</h1>
             <Button variant="ghost" size="icon" onClick={() => setIsInfoDialogOpen(true)}>
                <Info className="h-5 w-5 text-muted-foreground" />
             </Button>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            While the PDF in your GDrive is the permanent record, use this tool to log billable time and orchestrate follow-up tasks.
          </p>
        </header>

        <Card className="w-full flex-1 flex flex-col shadow-xl">
          <CardHeader className="bg-primary/5 border-b">
            <CardTitle>Activity Details</CardTitle>
            <CardDescription>
              Link this email event to a client and worker record for payroll and invoicing sync.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 flex-1 flex flex-col pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-primary">Client / Contact Association</Label>
                  <div className="flex items-center gap-2">
                    <Popover
                      open={isContactPopoverOpen}
                      onOpenChange={setIsContactPopoverOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between h-11"
                          disabled={isLoading}
                        >
                          <span className="truncate">{selectedContact?.name || 'Select a contact from Hub...'}</span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command filter={(value, search) => value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}>
                          <CommandInput placeholder="Search all contacts..." />
                          <CommandList>
                            <CommandEmpty>
                              {isLoading ? (
                                <div className="flex justify-center p-2"><LoaderCircle className="h-4 w-4 animate-spin" /></div>
                              ) : (
                                'No contact found.'
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
                                  <div className="flex flex-col">
                                      <span className="font-bold">{c.name}</span>
                                      <span className="text-[10px] uppercase font-bold text-muted-foreground">{c.businessName}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                     <Button type="button" variant="outline" size="icon" className="h-11 w-11" onClick={() => { setContactToEdit(null); setIsContactFormOpen(true); }}><Plus className="h-4 w-4"/></Button>
                     <Button type="button" variant="outline" size="icon" className="h-11 w-11" onClick={handleEditContact} disabled={!selectedContactId}><Edit className="h-4 w-4"/></Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject" className="text-xs uppercase font-bold text-primary">Subject of Activity</Label>
                  <Input
                    id="subject"
                    placeholder="e.g., Reviewing contract terms"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="h-11"
                  />
                </div>
            </div>
            <div className="space-y-2 flex-1 flex flex-col">
              <Label htmlFor="body" className="text-xs uppercase font-bold text-primary">Operational Context / Notes</Label>
              <Textarea
                id="body"
                placeholder="Briefly describe the work performed or copy relevant snippets from the email thread..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="flex-1 resize-none"
              />
            </div>
             <Card className="bg-muted/30 border-dashed">
              <CardHeader className="py-3">
                <CardTitle className="text-sm uppercase tracking-widest font-bold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Temporal Orchestration
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
                  <div className="space-y-2">
                      <Label className="text-xs font-semibold">Start Time</Label>
                       <Popover open={isStartPopoverOpen} onOpenChange={setIsStartPopoverOpen}>
                          <PopoverTrigger asChild>
                              <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal h-10", !startDate && "text-muted-foreground")}>
                                  <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                  {startDate ? format(startDate, "PPP") : <span>Pick a start date</span>}
                              </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CustomCalendar 
                                mode="single" 
                                selected={startDate} 
                                onSelect={(date) => { setStartDate(date); setIsStartPopoverOpen(false); }} 
                                initialFocus 
                            />
                          </PopoverContent>
                      </Popover>
                      <div className="flex gap-2">
                          <Select value={startHour} onValueChange={setStartHour}><SelectTrigger className="h-10"><SelectValue placeholder="Hr" /></SelectTrigger><SelectContent>{hourOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
                          <Select value={startMinute} onValueChange={setStartMinute}><SelectTrigger className="h-10"><SelectValue placeholder="Min" /></SelectTrigger><SelectContent>{minuteOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
                      </div>
                  </div>
                   <div className="space-y-2">
                      <Label className="text-xs font-semibold">End Time</Label>
                       <Popover open={isEndPopoverOpen} onOpenChange={setIsEndPopoverOpen}>
                          <PopoverTrigger asChild>
                              <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal h-10", !endDate && "text-muted-foreground")}>
                                  <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                  {endDate ? format(endDate, "PPP") : <span>Pick an end date</span>}
                              </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CustomCalendar 
                                mode="single" 
                                selected={endDate} 
                                onSelect={(date) => { setEndDate(date); setIsEndPopoverOpen(false); }} 
                                initialFocus 
                            />
                          </PopoverContent>
                      </Popover>
                      <div className="flex gap-2">
                          <Select value={endHour} onValueChange={setEndHour}><SelectTrigger className="h-10"><SelectValue placeholder="Hr" /></SelectTrigger><SelectContent>{hourOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
                          <Select value={endMinute} onValueChange={setEndMinute}><SelectTrigger className="h-10"><SelectValue placeholder="Min" /></SelectTrigger><SelectContent>{minuteOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
                      </div>
                  </div>
              </CardContent>
            </Card>
          </CardContent>
          <CardFooter className="justify-end bg-muted/10 border-t p-6">
            <Button onClick={handleLogTime} disabled={isSaving} size="lg" className="font-bold shadow-xl h-14 px-10 text-lg">
              {isSaving ? <LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> : <Clock className="mr-2 h-5 w-5" />}
              Push to Master Mind
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

      <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>The Email Orchestration Bridge</DialogTitle>
                <DialogDescription>
                    Convert communication into operational and financial value.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="flex items-start gap-4">
                    <FileDigit className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                    <div>
                        <h4 className="font-semibold">BKS Accounting Sync</h4>
                        <p className="text-sm text-muted-foreground">Logging the time spent on client emails ensures that every minute of your expertise is captured for professional invoicing.</p>
                    </div>
                </div>
                 <div className="flex items-start gap-4">
                    <Briefcase className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                    <div>
                        <h4 className="font-semibold">Spider Web Connectivity</h4>
                        <p className="text-sm text-muted-foreground">"Push to Master Mind" pre-fills your scheduler node, allowing you to instantly book follow-ups or linked tasks across your project boards.</p>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button onClick={() => setIsInfoDialogOpen(false)}>Close</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
