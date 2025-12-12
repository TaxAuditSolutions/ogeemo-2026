
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, MoreVertical, Trash2, Briefcase, ListChecks, LoaderCircle, Pencil, ArrowDownUp } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getIdeas, addIdea, deleteIdea, updateIdea } from '@/services/ideas-service';
import { type Idea, type Project, type Event as TaskEvent } from '@/types/calendar-types';
import { archiveIdeaAsFile } from '@/services/file-service';
import { addProject } from '@/services/project-service';
import { getContacts, type Contact } from '@/services/contact-service';
import { NewTaskDialog } from '@/components/tasks/NewTaskDialog';

export function IdeaListView() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [newIdeaText, setNewIdeaText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [initialDialogData, setInitialDialogData] = useState({});
  const [contacts, setContacts] = useState<Contact[]>([]);

  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [userIdeas, userContacts] = await Promise.all([
        getIdeas(user.uid),
        getContacts(user.uid),
      ]);
      setIdeas(userIdeas);
      setContacts(userContacts);
    } catch (error) {
      console.error("Failed to load ideas:", error);
      toast({
        variant: 'destructive',
        title: 'Failed to load items',
        description: 'Could not retrieve your idea list.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddIdea = async () => {
    if (!newIdeaText.trim() || !user) return;

    try {
      const savedIdea = await addIdea({
        title: newIdeaText.trim(),
        status: 'Maybe', // Default status for new ideas
        position: ideas.length,
        userId: user.uid,
        createdAt: new Date(),
      });
      setIdeas(prev => [savedIdea, ...prev]);
      setNewIdeaText('');
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save new idea.' });
    }
  };

  const handleDeleteIdea = async (id: string) => {
    const originalIdeas = [...ideas];
    setIdeas(ideas.filter(idea => idea.id !== id));
    try {
      await deleteIdea(id);
    } catch (error) {
      setIdeas(originalIdeas);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the idea.' });
    }
  };
  
  const handleStartEdit = (idea: Idea) => {
    setEditingId(idea.id);
    setEditingText(idea.title);
  };
  
  const handleUpdateIdea = async () => {
    if (!editingId || !editingText.trim()) {
      setEditingId(null);
      return;
    }
    const ideaToUpdate = ideas.find(i => i.id === editingId);
    if (!ideaToUpdate || ideaToUpdate.title === editingText.trim()) {
      setEditingId(null);
      return;
    }

    const updatedIdea = { ...ideaToUpdate, title: editingText.trim() };
    setIdeas(prev => prev.map(t => t.id === editingId ? updatedIdea : t));
    
    try {
      await updateIdea(editingId, { title: editingText.trim() });
    } catch (error) {
      setIdeas(prev => prev.map(t => t.id === editingId ? todoToUpdate : t));
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update item.' });
    } finally {
      setEditingId(null);
    }
  };
  
  const handleMakeProject = (idea: Idea) => {
    setInitialDialogData({ name: idea.title, description: idea.description });
    setIsNewProjectDialogOpen(true);
  };

  const handleProjectCreated = async (projectData: Omit<Project, 'id' | 'createdAt' | 'userId'>, tasks: Omit<TaskEvent, 'id' | 'userId' | 'projectId'>[]) => {
    if (!user) return;
    try {
        const newProject = await addProject({ ...projectData, status: 'planning', userId: user.uid, createdAt: new Date() });
        toast({ title: "Project Created", description: `"${newProject.name}" has been successfully created.` });
        router.push(`/projects/${newProject.id}/tasks`);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Failed to create project", description: error.message });
    }
  };
  
  const handleArchive = async (idea: Idea) => {
    if (!user) return;
    try {
      await archiveIdeaAsFile(user.uid, idea.title, idea.description || '');
      await handleDeleteIdea(idea.id);
      toast({ title: 'Archived', description: 'Idea saved to File Manager.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Archive Failed', description: error.message });
    }
  };

  return (
    <>
      <div className="p-4 sm:p-6 flex flex-col items-center h-full">
        <header className="text-center mb-6">
          <h1 className="text-3xl font-bold font-headline text-primary">Idea Board</h1>
          <p className="text-muted-foreground">A simple place to quickly capture your ideas.</p>
          <div className="mt-4 flex justify-center gap-2">
              <Button onClick={() => router.push('/idea-board/organize')}>
                  <ArrowDownUp className="mr-2 h-4 w-4"/> Organize Ideas
              </Button>
          </div>
        </header>

        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>My Ideas</CardTitle>
            <div className="flex w-full items-center space-x-2 pt-2">
              <Input
                type="text"
                placeholder="e.g., A new marketing campaign..."
                value={newIdeaText}
                onChange={(e) => setNewIdeaText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddIdea(); }}
              />
              <Button onClick={handleAddIdea}>
                <Plus className="mr-2 h-4 w-4" /> Add Idea
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {isLoading ? (
                  <div className="flex items-center justify-center p-8">
                      <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                  </div>
              ) : ideas.length > 0 ? (
                ideas.map(idea => (
                  <div key={idea.id} className="flex items-center gap-2 p-2 rounded-md border bg-muted/50">
                    {editingId === idea.id ? (
                        <Input
                            autoFocus
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onBlur={handleUpdateIdea}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateIdea(); if (e.key === 'Escape') setEditingId(null); }}
                            className="flex-1"
                        />
                    ) : (
                        <p className="flex-1">{idea.title}</p>
                    )}
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => handleStartEdit(idea)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleMakeProject(idea)}>
                          <Briefcase className="mr-2 h-4 w-4" /> Make a Project
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleArchive(idea)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Archive
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleDeleteIdea(idea.id)} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Permanently
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                  <p>Your idea board is empty. Add an idea above to get started!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
       <NewTaskDialog
            isOpen={isNewProjectDialogOpen}
            onOpenChange={setIsNewProjectDialogOpen}
            onProjectCreate={handleProjectCreated}
            contacts={contacts}
            onContactsChange={setContacts}
            projectToEdit={null}
            initialData={initialDialogData}
        />
    </>
  );
}
