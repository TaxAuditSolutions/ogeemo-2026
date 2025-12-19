
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
import { ArrowLeft, LoaderCircle, X, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import ContactFormDialog from '@/components/contacts/contact-form-dialog';
import { type Contact } from '@/data/contacts';
import { type FolderData, getFolders as getContactFolders } from '@/services/contact-folder-service';
import { type Company, getCompanies } from '@/services/accounting-service';
import { type Industry, getIndustries } from '@/services/industry-service';

const LEADS_STORAGE_KEY = 'crmLeads';

type LeadStatus = 'New' | 'Unscheduled Leads' | 'Scheduled Leads' | 'Completed Leads';

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
  const [status, setStatus] = useState<LeadStatus>('New');
  const [notes, setNotes] = useState('');
  
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [contactFolders, setContactFolders] = useState<FolderData[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customIndustries, setCustomIndustries] = useState<Industry[]>([]);
  
  const loadDropdownData = useCallback(async () => {
    if (!user) return;
    try {
        const [foldersData, companiesData, industriesData] = await Promise.all([
            getContactFolders(user.uid),
            getCompanies(user.uid),
            getIndustries(user.uid)
        ]);
        setContactFolders(foldersData);
        setCompanies(companiesData);
        setCustomIndustries(industriesData);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load necessary data for contact creation.' });
    }
  }, [user, toast]);

  useEffect(() => {
    loadDropdownData();
  }, [loadDropdownData]);
  
  useEffect(() => {
    if (leadId) {
      try {
        const existingLeadsRaw = sessionStorage.getItem(LEADS_STORAGE_KEY);
        const existingLeads = existingLeadsRaw ? JSON.parse(existingLeadsRaw) : [];
        const leadToEdit = existingLeads.find((l: any) => l.id === leadId);
        
        if (leadToEdit) {
          setIsEditing(true);
          setContactName(leadToEdit.contactName || '');
          setCompanyName(leadToEdit.companyName || '');
          setEmail(leadToEdit.email || '');
          setPhone(leadToEdit.phone || '');
          setSource(leadToEdit.source || '');
          setStatus(leadToEdit.status || 'New');
          setNotes(leadToEdit.notes || '');
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Could not find the lead to edit.' });
          router.push('/crm/plan');
        }
      } catch (error) {
         toast({ variant: 'destructive', title: 'Error', description: 'Failed to load lead data.' });
      }
    }
  }, [leadId, router, toast]);

  const handleSaveLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !email.trim()) {
        toast({
            variant: 'destructive',
            title: 'Missing Information',
            description: 'Please fill out at least the Contact Name and Email fields.',
        });
        return;
    }
    
    setIsLoading(true);

    try {
        const existingLeadsRaw = sessionStorage.getItem(LEADS_STORAGE_KEY);
        const existingLeads = existingLeadsRaw ? JSON.parse(existingLeadsRaw) : [];
        let updatedLeads;
        
        if (isEditing) {
            updatedLeads = existingLeads.map((l: any) => {
                if (l.id === leadId) {
                    return { ...l, contactName, companyName, email, phone, source, status, notes };
                }
                return l;
            });
            toast({ title: 'Lead Updated', description: `Changes to "${contactName}" have been saved.` });
        } else {
            const newLead = { id: `lead_${Date.now()}`, contactName, companyName, email, phone, source, status, notes };
            updatedLeads = [...existingLeads, newLead];
            toast({ title: 'Lead Created', description: `"${contactName}" has been added to your leads list.` });
        }

        sessionStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(updatedLeads));
        router.push('/crm/plan');

    } catch (error) {
        console.error("Failed to save lead:", error);
        toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the lead to session storage.' });
        setIsLoading(false);
    }
  };
  
  const handleContactSave = (savedContact: Contact) => {
      setContactName(savedContact.name);
      setEmail(savedContact.email || '');
      setCompanyName(savedContact.businessName || '');
      setIsContactFormOpen(false);
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
                <Label htmlFor="contact-name">Contact Name</Label>
                <div className="flex gap-2">
                    <Input id="contact-name" placeholder="e.g., Jane Smith" value={contactName} onChange={e => setContactName(e.target.value)} />
                    <Button type="button" variant="outline" onClick={() => setIsContactFormOpen(true)}><Plus className="mr-2 h-4 w-4" /> New</Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input id="company-name" placeholder="e.g., ACME Innovations" value={companyName} onChange={e => setCompanyName(e.target.value)} />
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
                      <SelectItem value="New">New</SelectItem>
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

