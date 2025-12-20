
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, LoaderCircle, X, Plus, ChevronsUpDown, Check, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import ContactFormDialog from '@/components/contacts/contact-form-dialog';
import { type Contact, getContacts } from '@/services/contact-service';
import { type FolderData, getFolders as getContactFolders } from '@/services/contact-folder-service';
import { type Company, getCompanies } from '@/services/accounting-service';
import { type Industry, getIndustries } from '@/services/industry-service';
import { getLeadById, addLead, updateLead, type Lead, type LeadStatus } from '@/services/lead-service';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';


export default function CreateLeadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const leadId = searchParams.get('id');

  const [contactName, setContactName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState('');
  const [status, setStatus] = useState<LeadStatus>('Unscheduled Leads');
  const [notes, setNotes] = useState('');
  
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [contactToEdit, setContactToEdit] = useState<Contact | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactFolders, setContactFolders] = useState<FolderData[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customIndustries, setCustomIndustries] = useState<Industry[]>([]);
  const [isContactPopoverOpen, setIsContactPopoverOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  
  const loadDropdownData = useCallback(async () => {
    if (!user) return;
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
    }
  }, [user, toast]);

  useEffect(() => {
    loadDropdownData();
  }, [loadDropdownData]);
  
  useEffect(() => {
    if (leadId) {
      const loadLead = async () => {
          setIsLoading(true);
          try {
            const leadToEdit = await getLeadById(leadId);
            if (leadToEdit) {
              setIsEditing(true);
              setContactName(leadToEdit.contactName || '');
              setCompanyName(leadToEdit.companyName || '');
              setEmail(leadToEdit.email || '');
              setPhone(leadToEdit.phone || '');
              setSource(leadToEdit.source || '');
              setStatus(leadToEdit.status || 'Unscheduled Leads');
              setNotes(leadToEdit.notes || '');

              // Try to find and set the matching contact
              const matchingContact = contacts.find(c => c.name === leadToEdit.contactName && c.email === leadToEdit.email);
              if (matchingContact) {
                  setSelectedContact(matchingContact);
              }

            } else {
              toast({ variant: 'destructive', title: 'Error', description: 'Could not find the lead to edit.' });
              router.push('/crm/plan');
            }
          } catch (error) {
             toast({ variant: 'destructive', title: 'Error', description: 'Failed to load lead data.' });
          } finally {
              setIsLoading(false);
          }
      }
      if (contacts.length > 0) { // Ensure contacts are loaded before trying to find a match
        loadLead();
      }
    }
  }, [leadId, router, toast, contacts]);

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !email.trim() || !user) {
        toast({
            variant: 'destructive',
            title: 'Missing Information',
            description: 'Please fill out at least the Contact Name, Email, and ensure you are logged in.',
        });
        return;
    }
    
    setIsLoading(true);

    const leadData: Omit<Lead, 'id' | 'userId'> = {
        contactName,
        companyName,
        email,
        phone,
        source,
        status,
        notes,
    };

    try {
        if (isEditing && leadId) {
            await updateLead(leadId, leadData);
            toast({ title: 'Lead Updated', description: `Changes to "${contactName}" have been saved.` });
        } else {
            await addLead({ ...leadData, userId: user.uid });
            toast({ title: 'Lead Created', description: `"${contactName}" has been added to your leads list.` });
        }
        router.push('/crm/plan');
    } catch (error) {
        console.error("Failed to save lead:", error);
        toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the lead to the database.' });
        setIsLoading(false);
    }
  };
  
  const handleContactSave = (savedContact: Contact, isEditing: boolean) => {
      if (isEditing) {
          setContacts(prev => prev.map(c => c.id === savedContact.id ? savedContact : c));
          if(selectedContact?.id === savedContact.id) {
            setSelectedContact(savedContact); // Update selected contact details
            setCompanyName(savedContact.businessName || ''); // Update company name field
          }
      } else {
          setContacts(prev => [savedContact, ...prev]);
      }
      handleSelectContact(savedContact); // This will set the name, email, etc.
      setIsContactFormOpen(false);
      setContactToEdit(null);
  };
  
  const handleEditContact = () => {
    if (selectedContact) {
      setContactToEdit(selectedContact);
      setIsContactFormOpen(true);
    }
  };

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setContactName(contact.name);
    setEmail(contact.email || '');
    setCompanyName(contact.businessName || '');
    setPhone(contact.cellPhone || contact.businessPhone || contact.homePhone || '');
    setIsContactPopoverOpen(false);
  };

  return (
    <>
      <div className="p-4 sm:p-6 flex flex-col items-center h-full">
        <header className="w-full max-w-2xl text-center relative mb-6">
          <div className="absolute left-0 top-1/2 -translate-y-1/2">
              <Button asChild variant="outline">
                  <Link href="/crm/plan">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to CRM Plan
                  </Link>
              </Button>
          </div>
          <h1 className="text-3xl font-bold font-headline text-primary">
            {isEditing ? 'Edit Lead' : 'Create New Lead'}
          </h1>
          <div className="absolute right-0 top-1/2 -translate-y-1/2">
              <Button asChild variant="ghost" size="icon">
                  <Link href="/crm/plan">
                      <X className="h-5 w-5" />
                      <span className="sr-only">Close</span>
                  </Link>
              </Button>
          </div>
        </header>
        <Card className="w-full max-w-2xl">
          <form onSubmit={handleSaveLead}>
              <CardHeader>
              <CardTitle>Lead Information</CardTitle>
              <CardDescription>
                  {isEditing ? 'Update the information for this lead.' : 'Fill out the form below to add a new lead to your pipeline.'}
              </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <div className="flex gap-2">
                    <Popover open={isContactPopoverOpen} onOpenChange={setIsContactPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between"
                            >
                                <span className="truncate">{contactName || "Select or search for a contact..."}</span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput placeholder="Search or type to add..." onValueChange={setContactName} value={contactName} />
                                <CommandList>
                                <CommandEmpty>No contact found.</CommandEmpty>
                                <CommandGroup>
                                    {contacts.map((contact) => (
                                    <CommandItem
                                        key={contact.id}
                                        value={contact.name}
                                        onSelect={() => handleSelectContact(contact)}
                                    >
                                        <Check className={cn("mr-2 h-4 w-4", selectedContact?.id === contact.id ? "opacity-100" : "opacity-0")} />
                                        {contact.name}
                                    </CommandItem>
                                    ))}
                                </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    <Button type="button" variant="outline" onClick={() => { setContactToEdit(null); setIsContactFormOpen(true); }}><Plus className="mr-2 h-4 w-4" /> New</Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <div className="flex gap-2 items-center">
                    <div className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      {companyName || <span className="text-muted-foreground">Not set</span>}
                    </div>
                    {selectedContact && (
                        <Button type="button" variant="outline" onClick={handleEditContact}>
                            <Edit className="mr-2 h-4 w-4" />
                            {companyName ? 'Edit' : 'Add'} Company
                        </Button>
                    )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="jane.smith@acme.com" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" placeholder="(555) 123-4567" value={phone} onChange={e => setPhone(e.target.value)} />
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                  <Label htmlFor="lead-source">Lead Source</Label>
                  <Select value={source} onValueChange={setSource}>
                      <SelectTrigger id="lead-source">
                      <SelectValue placeholder="Select a source" />
                      </SelectTrigger>
                      <SelectContent>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="trade-show">Trade Show</SelectItem>
                      <SelectItem value="advertisement">Advertisement</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                  </Select>
                  </div>
                  <div className="space-y-2">
                  <Label htmlFor="lead-status">Status</Label>
                  <Select value={status} onValueChange={(value) => setStatus(value as LeadStatus)}>
                      <SelectTrigger id="lead-status">
                      <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                      <SelectContent>
                      <SelectItem value="Unscheduled Leads">Unscheduled Leads</SelectItem>
                      <SelectItem value="Scheduled Leads">Scheduled Leads</SelectItem>
                      <SelectItem value="Completed Leads">Completed Leads</SelectItem>
                      </SelectContent>
                  </Select>
                  </div>
              </div>
              <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                  id="notes"
                  placeholder="Add any relevant details about this lead..."
                  rows={4}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  />
              </div>
              </CardContent>
              <CardFooter className="justify-end">
                  <Button type="submit" disabled={isLoading}>
                      {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                      {isEditing ? 'Save Changes' : 'Save Lead'}
                  </Button>
              </CardFooter>
          </form>
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
    </>
  );
}
