'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { LoaderCircle, Save, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getFileById, updateFile, type FileItem } from '@/services/file-service';
import { Label } from '@/components/ui/label';

export default function NoteEditorPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { toast } = useToast();

    const [file, setFile] = useState<FileItem | null>(null);
    const [content, setContent] = useState('');
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const fileId = searchParams.get('fileId');

    const loadData = useCallback(async () => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Authentication Error', description: 'Please log in.' });
            router.push('/login');
            return;
        }

        if (!fileId) {
            toast({ variant: 'destructive', title: 'No File Specified', description: 'Returning to notes hub.' });
            router.push('/notes');
            return;
        }

        setIsLoading(true);
        try {
            const fetchedFile = await getFileById(fileId);
            if (fetchedFile) {
                setFile(fetchedFile);
                setContent(fetchedFile.content || '');
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'File not found.' });
                router.push('/notes');
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to load note', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [fileId, user, router, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const handleSave = async () => {
        if (!user || !file) return;

        setIsSaving(true);
        try {
            await updateFile(file.id, { content: content });
            toast({ title: 'Note Saved', description: `Your changes to "${file.name}" have been saved.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };
    
    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center p-4">
                <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="p-4 sm:p-6 h-full flex flex-col items-center">
             <header className="text-center mb-6 w-full max-w-4xl">
                <div className="flex justify-between items-center">
                    <Button variant="outline" onClick={() => router.push('/notes')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Notes
                    </Button>
                    <div className="text-center flex-1">
                        <h1 className="text-2xl font-bold font-headline text-primary truncate">
                            {file?.name || "Editing Note"}
                        </h1>
                    </div>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Content
                    </Button>
                </div>
            </header>
            <Card className="w-full max-w-4xl flex-1 flex flex-col">
                <CardContent className="p-4 pt-4 flex-1 flex flex-col">
                     <Label htmlFor="note-content" className="sr-only">Content</Label>
                    <Textarea
                        id="note-content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="h-full w-full resize-none flex-1"
                        placeholder="Start writing your note here..."
                    />
                </CardContent>
            </Card>
        </div>
    );
}
