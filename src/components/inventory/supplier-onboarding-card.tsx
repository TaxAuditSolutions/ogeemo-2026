
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ContactSelector } from '@/components/contacts/contact-selector';
import { type Contact } from '@/services/contact-service';
import ContactFormDialog from '@/components/contacts/contact-form-dialog';
import { useToast } from '@/hooks/use-toast';
import { designateContactAsSupplier } from '@/services/supplier-service';
import { LoaderCircle } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

interface SupplierOnboardingCardProps {
  contacts: Contact[];
  onSave: () => void;
  onCancel: () => void;
}

export function SupplierOnboardingCard({ contacts, onSave, onCancel }: SupplierOnboardingCardProps) {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [isNewContactOpen, setIsNewContactOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const handleSave = async () => {
    if (!selectedContactId || !user) {
        toast({ variant: 'destructive', title: 'Please select a contact.'});
        return;
    }
    setIsSaving(true);
    try {
        await designateContactAsSupplier(user.uid, selectedContactId);
        onSave();
    } catch(error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <>
      <Card className="w-full animate-in fade-in-50">
        <CardHeader>
          <CardTitle>Supplier Onboarding</CardTitle>
          <CardDescription>Select an existing contact or create a new one to designate them as a supplier.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
                <label className="text-sm font-medium">Select Contact</label>
                <ContactSelector contacts={contacts} selectedContactId={selectedContactId} onSelectContact={setSelectedContactId} className="w-full" />
            </div>
            <div className="flex-1 space-y-2">
                 <label className="text-sm font-medium">Or, Create New</label>
                <Button variant="outline" className="w-full" onClick={() => setIsNewContactOpen(true)}>Create New Contact</Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button onClick={handleSave} disabled={!selectedContactId || isSaving}>
                {isSaving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin"/>}
                Designate as Supplier
            </Button>
        </CardFooter>
      </Card>

      {/* The ContactFormDialog is complex and requires many props which we don't have here yet.
          This will be fully implemented in a later step. For now, it won't render.
          <ContactFormDialog
            isOpen={isNewContactOpen}
            onOpenChange={setIsNewContactOpen}
            // ... other props
          /> 
      */}
    </>
  );
}
