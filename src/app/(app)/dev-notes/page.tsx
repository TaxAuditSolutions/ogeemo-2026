'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Palette, BookOpen, Beaker, Plus, Save, LoaderCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const DEV_NOTES_KEY = 'ogeemo-dev-notes';

export default function DevNotesPage() {
  const [noteContent, setNoteContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const savedNote = localStorage.getItem(DEV_NOTES_KEY);
      if (savedNote) {
        setNoteContent(savedNote);
      }
    } catch (error) {
      console.error("Failed to load notes from localStorage", error);
    }
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    try {
      localStorage.setItem(DEV_NOTES_KEY, noteContent);
      toast({
        title: "Note Saved",
        description: "Your development notes have been saved locally.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Could not save notes to local storage.",
      });
    } finally {
      // Simulate a short delay to show saving state
      setTimeout(() => setIsSaving(false), 500);
    }
  };


  return (
    <div className="p-4 sm:p-6 flex flex-col items-center h-full">
      <header className="text-center mb-6 w-full max-w-4xl">
        <div className="flex items-center justify-center relative">
          <h1 className="text-2xl font-bold font-headline text-primary">
            Dev Notes & Resources
          </h1>
          <div className="absolute right-0">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Create Note
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground mt-2">
          A place to access developer documentation and jot down notes.
        </p>
      </header>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <Card className="md:col-span-2">
            <CardHeader>
                <CardTitle>Developer Resources</CardTitle>
                <CardDescription>Quick links to helpful development resources.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Button asChild className="w-full">
                    <a href="/styles/BUTTON_STYLES.md" target="_blank" rel="noopener noreferrer">
                        <Palette className="mr-2 h-4 w-4" /> View Button Styles
                    </a>
                </Button>
                <Button asChild className="w-full">
                    <a href="/styles/COLOR_PALETTE.md" target="_blank" rel="noopener noreferrer">
                        <Palette className="mr-2 h-4 w-4" /> View Color Palette
                    </a>
                </Button>
                <Button asChild className="w-full">
                    <a href="/styles/DEV_TERMS.md" target="_blank" rel="noopener noreferrer">
                        <BookOpen className="mr-2 h-4 w-4" /> View Dev Terms
                    </a>
                </Button>
            </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
            <CardHeader>
                <CardTitle>Notes</CardTitle>
                <CardDescription>Jot down your thoughts and notes here. They will be saved to your browser's local storage.</CardDescription>
            </CardHeader>
            <CardContent>
                <Textarea 
                    placeholder="Start typing your note..." 
                    rows={10} 
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                />
            </CardContent>
             <CardFooter className="justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {isSaving ? 'Saving...' : 'Save Note'}
                </Button>
            </CardFooter>
        </Card>
      </div>
    </div>
  );
}
