
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
import { ArrowLeft, LoaderCircle, X, Plus, ChevronsUpDown, Check, Edit, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import ContactFormDialog from '@/components/contacts/contact-form-dialog';
import { type Contact, getContacts, getContactById, addContact, updateContact } from '@/services/contact-service';
import { ensureSystemFolders, type FolderData } from '@/services/contact-folder-service';
import { type Company, getCompanies } from '@/services/accounting-service';
import { type Industry, getIndustries } from '@/services/industry-service';
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
  const contactId = searchParams.get('id');

  const [contactName, setContactName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<string>('Unscheduled Leads');
  const [notes, setNotes] = useState('');
  
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactFolders, setContactFolders] = useState<FolderData[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customIndustries, setCustomIndustries] = useState<Industry[]>([]);
  const [isContactPopoverOpen, setIsContactPopoverOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  
  const [prospectsFolderId, setProspectsFolderId] = useState<string | null>(null);

  const loadDropdownData = useCallback(async () => {
    if (!user) return;
    try {
        const [foldersData, companiesData, industriesData, contactsData] = await Promise.all([
            ensureSystemFolders(user.uid),
            getCompanies(user.uid),
            getIndustries(user.uid),
            getContacts(user.uid),
        ]);
        setContactFolders(foldersData);
        setCompanies(companiesData);
        setCustomIndustries(industriesData);
        setContacts(contactsData);
        
        const prospectsFolder = foldersData.find(f => f.name === 'Prospects' && f.isSystem);
        if (prospectsFolder) setProspectsFolderId(prospectsFolder.id);

    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load necessary data.' });
    }
  }, [user, toast]);

  useEffect(() => {
    loadDropdownData();
  }, [loadDropdownData]);
  
  useEffect(() => {
    if (contactId && contacts.length > 0) {
      const loadLead = async () => {
          setIsLoading(true);
          try {
            const leadToEdit = await getContactById(contactId);
            if (leadToEdit) {
              setIsEditing(true);
              setContactName(leadToEdit.name || '');
              setCompanyName(leadToEdit.businessName || '');
              setEmail(leadToEdit.email || '');
              setPhone(leadToEdit.cellPhone || leadToEdit.businessPhone || '');
              setStatus(leadToEdit.status || 'Unscheduled Leads');
              setNotes(leadToEdit.notes || '');
              setSelectedContact(leadToEdit);
            } else {
              toast({ variant: 'destructive', title: 'Error', description: 'Could not find the record.' });
              router.push('/crm/plan');
            }
          } catch (error) {
             toast({ variant: 'destructive', title: 'Error', description: 'Failed to load data.' });
          } finally {
              setIsLoading(false);
          }
      }
      loadLead();
    }
  }, [contactId, router, toast, contacts]);

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !user || !prospectsFolderId) {
        toast({ variant: 'destructive', title: 'Missing Information' });
        return;
    }
    
    setIsLoading(true);
    try {
        const data: Partial<Contact> = {
            name: contactName,
            businessName: companyName,
            email: email,
            cellPhone: phone,
            status: status,
            notes: notes,
            folderId: prospectsFolderId,
        };

        if (isEditing && contactId) {
            await updateContact(contactId, data);
            toast({ title: 'Prospect Updated' });
        } else {
            await addContact({ ...data, userId: user.uid } as any);
            toast({ title: 'Prospect Added to Pipeline' });
        }
        router.push('/crm/plan');
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    } finally {
        setIsLoading(false);
    }
  };

  const handlePromoteToContacts = async () => {
    if (!contactId || !user) return;
    setIsLoading(true);
    try {
        const clientsFolder = contactFolders.find(f => f.name === 'Clients' && f.isSystem);
        if (!clientsFolder) throw new Error("Could not find Clients folder.");

        await updateContact(contactId, { folderId: clientsFolder.id, status: 'Completed Leads' });
        toast({ title: 'Success!', description: `${contactName} is now a client.` });
        router.push('/contacts');
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Promotion Failed', description: error.message });
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setContactName(contact.name);
    setEmail(contact.email || '');
    setCompanyName(contact.businessName || '');
    setPhone(contact.cellPhone || contact.businessPhone || '');
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
                      Back to CRM
                  </Link>
              </Button>
          </div>
          <h1 className="text-3xl font-bold font-headline text-primary">
            {isEditing ? 'Manage Prospect' : 'New CRM Prospect'}
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
              <CardTitle>Prospect Information</CardTitle>
              <CardDescription>
                  This record is stored in your structural "Prospects" contact folder.
              </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Contact Name <span className="text-destructive">*</span></Label>
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
                    <Button type="button" variant="outline" onClick={() => { setSelectedContact(null); setIsContactFormOpen(true); }}><Plus className="mr-2 h-4 w-4" /> New</Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Company Name</Label>
                    <Input id="company-name" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Inc." />
                  </div>
                  <div className="space-y-2">
                  <Label htmlFor="lead-status">Pipeline Stage</Label>
                  <Select value={status} onValueChange={(value) => setStatus(value)}>
                      <SelectTrigger id="lead-status">
                      <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                      <SelectItem value="Unscheduled Leads">Unscheduled</SelectItem>
                      <SelectItem value="Scheduled Leads">Scheduled</SelectItem>
                      <SelectItem value="Completed Leads">Completed</SelectItem>
                      </SelectContent>
                  </Select>
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
              <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                  id="notes"
                  placeholder="History, preferences, or other background..."
                  rows={4}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  />
              </div>
              </CardContent>
              <CardFooter className="justify-between gap-4">
                  <div className="flex gap-2">
                    {isEditing && (
                        <Button type="button" variant="outline" onClick={handlePromoteToContacts} disabled={isLoading}>
                            <UserPlus className="mr-2 h-4 w-4" /> Promote to Client
                        </Button>
                    )}
                  </div>
                  <Button type="submit" disabled={isLoading}>
                      {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                      {isEditing ? 'Save Changes' : 'Add to Pipeline'}
                  </Button>
              </CardFooter>
          </form>
        </Card>
      </div>
      <ContactFormDialog
        isOpen={isContactFormOpen}
        onOpenChange={setIsContactFormOpen}
        contactToEdit={null}
        folders={contactFolders}
        onFoldersChange={setContactFolders}
        onSave={(c) => handleSelectContact(c)}
        companies={companies}
        onCompaniesChange={setCompanies}
        customIndustries={customIndustries}
        onCustomIndustriesChange={setCustomIndustries}
        forceFolderId={prospectsFolderId || undefined}
      />
    </>
  );
}
