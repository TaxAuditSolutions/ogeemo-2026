
'use client';

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { getContacts, updateContact } from '@/services/contact-service';
import { getFiles, updateFile } from '@/services/file-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoaderCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const generateContactKeywords = (name: string, email: string, businessName?: string): string[] => {
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

const generateFileKeywords = (name: string): string[] => {
    const keywords = new Set<string>();
    const lowerCaseName = name.toLowerCase();
    keywords.add(lowerCaseName);
    lowerCaseName.split(/[\s-._]+/).forEach(part => {
        if (part) keywords.add(part);
    });
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
        setStatus('Fetching all contacts and files...');

        try {
            const [contacts, files] = await Promise.all([
                getContacts(user.uid),
                getFiles(user.uid),
            ]);
            
            let updatedContacts = 0;
            let updatedFiles = 0;

            for (const contact of contacts) {
                // Check if keywords already exist and are up-to-date to avoid unnecessary writes
                const newKeywords = generateContactKeywords(contact.name, contact.email, contact.businessName);
                if (Array.isArray(contact.keywords) && newKeywords.every(k => contact.keywords.includes(k)) && contact.keywords.length === newKeywords.length) {
                    continue;
                }
                setStatus(`Updating contact: ${contact.name}...`);
                await updateContact(contact.id, { keywords: newKeywords });
                updatedContacts++;
            }

            for (const file of files) {
                 // Check if keywords already exist and are up-to-date
                const newKeywords = generateFileKeywords(file.name);
                if (Array.isArray((file as any).keywords) && newKeywords.every(k => (file as any).keywords.includes(k)) && (file as any).keywords.length === newKeywords.length) {
                    continue;
                }
                setStatus(`Updating file: ${file.name}...`);
                await updateFile(file.id, { keywords: newKeywords });
                updatedFiles++;
            }
            
            toast({
                title: 'Update Complete',
                description: `${updatedContacts} contacts and ${updatedFiles} files were updated with new search keywords.`,
            });
            setStatus(`Update complete. ${updatedContacts} contacts and ${updatedFiles} files processed.`);

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
                        This is a one-time tool to update your existing contacts and files with the new search keywords. Click the button to process your data.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleUpdate} disabled={isLoading} className="w-full">
                        {isLoading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isLoading ? 'Processing...' : 'Update Search Data'}
                    </Button>
                    {status && (
                        <p className="mt-4 text-sm text-center text-muted-foreground">{status}</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

    
