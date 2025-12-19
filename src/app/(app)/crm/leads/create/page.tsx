'use client';

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
import { ArrowLeft } from 'lucide-react';

export default function CreateLeadPage() {
  // In a real app, you'd use react-hook-form here to manage state and validation.
  // For this prototype, we'll use simple controlled components.

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
              <Input id="contact-name" placeholder="e.g., Jane Smith" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input id="company-name" placeholder="e.g., ACME Innovations" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" placeholder="jane.smith@acme.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" placeholder="(555) 123-4567" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lead-source">Lead Source</Label>
              <Select>
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
              <Select defaultValue="new">
                <SelectTrigger id="lead-status">
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="unqualified">Unqualified</SelectItem>
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
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button>Save Lead</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
