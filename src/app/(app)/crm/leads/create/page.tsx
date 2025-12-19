
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const LEADS_STORAGE_KEY = 'crmLeads';

type LeadStatus = 'New' | 'Active Leads' | 'Scheduled Leads' | 'Completed Leads';

export default function CreateLeadPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [contactName, setContactName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState('');
  const [status, setStatus] = useState<LeadStatus>('New');
  const [notes, setNotes] = useState('');

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
        const newLead = {
            id: `lead_${Date.now()}`,
            contactName,
            companyName,
            email,
            phone,
            source,
            status,
            notes,
        };

        const existingLeadsRaw = sessionStorage.getItem(LEADS_STORAGE_KEY);
        const existingLeads = existingLeadsRaw ? JSON.parse(existingLeadsRaw) : [];
        const updatedLeads = [...existingLeads, newLead];

        sessionStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(updatedLeads));

        toast({
            title: 'Lead Created',
            description: `"${contactName}" has been added to your leads list.`,
        });

        router.push('/crm/plan');
    } catch (error) {
        console.error("Failed to save lead:", error);
        toast({
            variant: 'destructive',
            title: 'Save Failed',
            description: 'Could not save the lead to session storage.',
        });
        setIsLoading(false);
    }
  };

  return (
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
          Create New Lead
        </h1>
      </header>
      <Card className="w-full max-w-2xl">
        <form onSubmit={handleSaveLead}>
            <CardHeader>
            <CardTitle>Lead Information</CardTitle>
            <CardDescription>
                Fill out the form below to add a new lead to your pipeline.
            </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                <Label htmlFor="contact-name">Contact Name</Label>
                <Input id="contact-name" placeholder="e.g., Jane Smith" value={contactName} onChange={e => setContactName(e.target.value)} />
                </div>
                <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input id="company-name" placeholder="e.g., ACME Innovations" value={companyName} onChange={e => setCompanyName(e.target.value)} />
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
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Active Leads">Active Leads</SelectItem>
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
                    Save Lead
                </Button>
            </CardFooter>
        </form>
      </Card>
    </div>
  );
}
