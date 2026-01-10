
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ContactSelector } from '@/components/contacts/contact-selector';
import { type Contact } from '@/services/contact-service';
import ContactFormDialog from '@/components/contacts/contact-form-dialog';
import { useToast } from '@/hooks/use-toast';
import { designateContactAsSupplier } from '@/services/supplier-service';
import { LoaderCircle } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { getFolders as getContactFolders, type FolderData } from '@/services/contact-folder-service';
import { getCompanies, type Company } from '@/services/accounting-service';
import { getIndustries, type Industry } from '@/services/industry-service';
import { addContact } from '@/services/contact-service';


interface SupplierOnboardingCardProps {
  contacts: Contact[];
  onSave: () => void;
  onCancel: () => void;
  onContactsChange: (contacts: Contact[]) => void;
}

export function SupplierOnboardingCard({ contacts, onSave, onCancel, onContactsChange }: SupplierOnboardingCardProps) {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [isNewContactOpen, setIsNewContactOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // State for data required by ContactFormDialog
  const [contactFolders, setContactFolders] = useState<FolderData[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customIndustries, setCustomIndustries] = useState<Industry[]>([]);


  const loadDropdownData = useCallback(async () => {
    if (!user) return;
    try {
        const [foldersData, companiesData, industriesData] = await Promise.all([
            getContactFolders(user.uid),
            getCompanies(user.uid),
            getIndustries(user.uid),
        ]);
        setContactFolders(foldersData);
        setCompanies(companiesData);
        setCustomIndustries(industriesData);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load support data for contacts.' });
    }
  }, [user, toast]);

  useEffect(() => {
    if (isNewContactOpen) {
        loadDropdownData();
    }
  }, [isNewContactOpen, loadDropdownData]);


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

  const handleContactSave = (savedContact: Contact, isEditing: boolean) => {
      onContactsChange(isEditing 
        ? contacts.map(c => c.id === savedContact.id ? savedContact : c)
        : [...contacts, savedContact]
      );
      setSelectedContactId(savedContact.id);
      setIsNewContactOpen(false);
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
            <Button onClick={handleSave} disabled={!selectedContactId || isSaving}>
                {isSaving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin"/>}
                Designate as Supplier
            </Button>
        </CardFooter>
      </Card>
      
      <ContactFormDialog
        isOpen={isNewContactOpen}
        onOpenChange={setIsNewContactOpen}
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
