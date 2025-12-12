
'use client';

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { getContacts, updateContact } from '@/services/contact-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoaderCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const generateKeywords = (name: string, email: string, businessName?: string): string[] => {
    const keywords = new Set<string>();
    
    const addValue = (value: string | undefined) => {
        if (!value) return;
        const lowerCaseValue = value.toLowerCase();
        keywords.add(lowerCaseValue);
        lowerCaseValue.split(/[\s@.-]+/).forEach(part => {
            if (part) keywords.add(part);
        });
    };

    addValue(name);
    addValue(email);
    addValue(businessName);
    
    return Array.from(keywords);
};


export default function DataUpdaterPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState('');
    const { user } = useAuth();
    const { toast } = useToast();

    const handleUpdate = async () => {
        if (!user) {
            toast({ variant: 'destructive', title: 'You must be logged in.' });
            return;
        }

        setIsLoading(true);
        setStatus('Fetching contacts...');

        try {
            const contacts = await getContacts(user.uid);
            let updatedCount = 0;

            for (const contact of contacts) {
                // Check if keywords already exist to avoid unnecessary updates
                if (Array.isArray(contact.keywords) && contact.keywords.length > 0) {
                    continue;
                }

                setStatus(`Updating ${contact.name}...`);
                const keywords = generateKeywords(contact.name, contact.email, contact.businessName);
                await updateContact(contact.id, { keywords });
                updatedCount++;
            }
            
            toast({
                title: 'Update Complete',
                description: `${updatedCount} contacts were updated with new search keywords.`,
            });
            setStatus(`Update complete. ${updatedCount} contacts processed.`);

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
            setStatus(`Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 flex flex-col items-center justify-center h-full">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle>Data Updater Tool</CardTitle>
                    <CardDescription>
                        This is a one-time tool to update your existing contacts with the new search keywords. Click the button to process your contacts.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleUpdate} disabled={isLoading} className="w-full">
                        {isLoading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isLoading ? 'Processing...' : 'Update Contact Search Data'}
                    </Button>
                    {status && (
                        <p className="mt-4 text-sm text-center text-muted-foreground">{status}</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
