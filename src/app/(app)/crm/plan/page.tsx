'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';

const LEADS_STORAGE_KEY = 'crmLeads';

interface Lead {
  id: string;
  contactName: string;
  companyName: string;
  email: string;
  status: string;
}

export default function CrmPlanPage() {
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    // This effect runs on the client-side after the component mounts
    try {
      const savedLeadsRaw = sessionStorage.getItem(LEADS_STORAGE_KEY);
      if (savedLeadsRaw) {
        setLeads(JSON.parse(savedLeadsRaw));
      }
    } catch (error) {
      console.error("Failed to load leads from session storage:", error);
    }
  }, []);

  const inactiveLeads = leads.filter(lead => lead.status === 'New' || lead.status === 'Contacted');

  return (
    <div className="p-4 sm:p-6 space-y-6 h-full flex flex-col">
      <header className="flex items-center justify-between">
        <div className="w-1/4">
             <Button asChild variant="outline">
                <Link href="/crm">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to CRM Hub
                </Link>
            </Button>
        </div>
        <div className="text-center flex-1">
            <h1 className="text-3xl font-bold font-headline text-primary">
                The CRM Plan
            </h1>
        </div>
        <div className="w-1/4 flex justify-end">
            <Button asChild>
                <Link href="/crm/leads/create">
                    <Plus className="mr-2 h-4 w-4" />
                    Create a Lead
                </Link>
            </Button>
        </div>
      </header>
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
        <Card>
            <CardHeader>
                <CardTitle>Inactive Leads</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
               {inactiveLeads.length > 0 ? (
                 inactiveLeads.map(lead => (
                   <Card key={lead.id} className="p-2">
                     <p className="font-semibold text-sm">{lead.contactName}</p>
                     <p className="text-xs text-muted-foreground">{lead.companyName}</p>
                   </Card>
                 ))
               ) : (
                <p className="text-sm text-muted-foreground text-center pt-8">No inactive leads yet.</p>
               )}
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Active Leads</CardTitle>
            </CardHeader>
            <CardContent></CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Scheduled Leads</CardTitle>
            </CardHeader>
            <CardContent></CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Completed Leads</CardTitle>
            </CardHeader>
            <CardContent></CardContent>
        </Card>
      </div>
    </div>
  );
}
