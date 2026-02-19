'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, MoreVertical, Trash2, Briefcase, ListChecks, LoaderCircle, Pencil, Archive, Calendar, ArrowLeft, X, MessageSquare } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getIdeas, addIdea, deleteIdea, updateIdea } from '@/services/ideas-service';
import { type Idea, type Project, type Event as TaskEvent } from '@/types/calendar-types';
import { archiveIdeaAsFile } from '@/services/file-service';
import { addProject, addTask } from '@/services/project-service';
import { getContacts, type Contact } from '@/services/contact-service';
import { NewTaskDialog } from '@/components/tasks/NewTaskDialog';
import { Textarea } from '../ui/textarea';
import { addMinutes } from 'date-fns';
import EditIdeaDialog from './edit-idea-dialog';

export function IdeaListView() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showNewIdeaCard, setShowNewIdeaCard] = useState(false);
  const [newIdeaTitle, setNewIdeaTitle] = useState('');
  const [newIdeaDescription, setNewIdeaDescription] = useState('');

  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [initialDialogData, setInitialDialogData] = useState({});
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [taskToConvert, setTaskToConvert] = useState<Idea | null>(null);

  const [ideaToEdit, setIdeaToEdit] = useState<Idea | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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
    if (!newIdeaTitle.trim() || !user) {
        setShowNewIdeaCard(false);
        return;
    }

    try {
      const savedIdea = await addIdea({
        title: newIdeaTitle.trim(),
        description: newIdeaDescription.trim(),
        status: 'Maybe', 
        position: ideas.length,
        userId: user.uid,
        createdAt: new Date(),
      });
      setIdeas(prev => [...prev, savedIdea]);
      setNewIdeaTitle('');
      setNewIdeaDescription('');
      setShowNewIdeaCard(false);
      toast({ title: 'Idea Captured' });
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
    setIdeaToEdit(idea);
    setIsEditDialogOpen(true);
  };
  
  const handleSaveEditedIdea = async (updatedIdea: Idea) => {
    const originalIdeas = [...ideas];
    setIdeas(prev => prev.map(i => i.id === updatedIdea.id ? updatedIdea : i));
    
    try {
      const { id, ...dataToUpdate } = updatedIdea;
      await updateIdea(id, dataToUpdate);
      toast({ title: 'Idea Updated' });
    } catch (error) {
      setIdeas(originalIdeas);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update item.' });
    } finally {
      setIdeaToEdit(null);
    }
  };
  
  const handleMakeProject = (idea: Idea) => {
    const query = new URLSearchParams({
        title: idea.title,
        description: idea.description || '',
    }).toString();
    router.push(`/projects/create?${query}`);
  };
  
  const handleScheduleTask = async (idea: Idea) => {
    if (!user) {
        toast({ variant: "destructive", title: "You must be logged in." });
        return;
    }
    try {
        const now = new Date();
        const newTaskData: Omit<TaskEvent, 'id'> = {
            title: `From Idea: ${idea.title}`,
            description: idea.description || "",
            start: now,
            end: addMinutes(now, 30),
            status: 'todo',
            position: 0,
            userId: user.uid,
            isScheduled: true,
        };
        await addTask(newTaskData);
        await deleteIdea(idea.id);
        setIdeas(prev => prev.filter(i => i.id !== idea.id));
        toast({
            title: "Idea Scheduled",
            description: `A new task for "${idea.title}" has been created.`,
        });
        router.push('/calendar');
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Scheduling Failed",
            description: "Could not create a task from this idea.",
        });
    }
  };

  const handleProjectCreated = async (projectData: Omit<Project, 'id' | 'createdAt' | 'userId'>, tasks: Omit<TaskEvent, 'id' | 'userId' | 'projectId'>[]) => {
    if (!user || !taskToConvert) return;
    try {
        const newProject = await addProject({ ...projectData, status: 'planning', userId: user.uid, createdAt: new Date() });
        if (taskToConvert) {
          await deleteIdea(taskToConvert.id);
        }
        toast({ title: "Project Created", description: `"${newProject.name}" has been successfully created.` });
        router.push(`/project-plan?projectId=${newProject.id}`);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Failed to create project", description: error.message });
    } finally {
        setIsNewProjectDialogOpen(false);
        setTaskToConvert(null);
    }
  };
  
  const handleArchive = async (idea: Idea) => {
    if (!user) return;
    try {
      await archiveIdeaAsFile(user.uid, idea.title, idea.description || '');
      await deleteIdea(idea.id);
      loadData();
      toast({ title: 'Archived', description: 'Idea saved to File Manager.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Archive Failed', description: error.message });
    }
  };

  return (
    <>
      <div className="p-4 sm:p-6 flex flex-col h-full items-center">
        <header className="relative text-center mb-6 w-full max-w-2xl">
          <h1 className="text-3xl font-bold font-headline text-primary">Idea Board</h1>
          <p className="text-muted-foreground">A simple place to quickly capture your ideas.</p>
          <div className="mt-4 flex justify-center gap-2">
              <Button asChild>
                  <Link href="/idea-board/organize">
                      Organize Ideas
                  </Link>
              </Button>
              <Button asChild variant="outline">
                  <Link href="/to-do">
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back to To-Do List
                  </Link>
              </Button>
              <Button asChild variant="outline">
                  <Link href="/projects/all">
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back to Project List
                  </Link>
              </Button>
          </div>
           <div className="absolute top-0 right-0">
                <Button asChild variant="ghost" size="icon">
                    <Link href="/action-manager" aria-label="Close Idea Board">
                        <X className="h-5 w-5" />
                    </Link>
                </Button>
            </div>
        </header>

        <Card className="w-full max-w-2xl">
            <CardHeader>
                <CardTitle>My Ideas</CardTitle>
                {!showNewIdeaCard && (
                    <div className="pt-2">
                        <Button onClick={() => setShowNewIdeaCard(true)}>
                            <Plus className="mr-2 h-4 w-4" /> Record New Idea
                        </Button>
                    </div>
                )}
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {showNewIdeaCard && (
                        <Card className="mb-4 bg-muted/50">
                            <CardContent className="p-3 space-y-2">
                                <Input autoFocus placeholder="New idea title..." value={newIdeaTitle} onChange={e => setNewIdeaTitle(e.target.value)} />
                                <Textarea placeholder="Details (optional)..." value={newIdeaDescription} onChange={e => setNewIdeaDescription(e.target.value)} rows={2} />
                                <div className="flex justify-end gap-2">
                                    <Button size="sm" variant="ghost" onClick={() => setShowNewIdeaCard(false)}>Cancel</Button>
                                    <Button size="sm" onClick={handleAddIdea}>Save</Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                  {isLoading ? (
                      <div className="flex items-center justify-center p-8">
                          <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                      </div>
                  ) : ideas.length > 0 ? (
                    ideas.map(idea => (
                      <div key={idea.id} className="flex flex-col gap-1 p-2 rounded-md border bg-card hover:bg-muted/50 group">
                        <div className="flex items-center gap-2">
                            <div className="flex-1 cursor-pointer" onClick={() => handleStartEdit(idea)}>
                                <p className="font-semibold">{idea.title}</p>
                                {idea.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-1 flex items-center gap-1 mt-0.5">
                                        <MessageSquare className="h-3 w-3" />
                                        {idea.description}
                                    </p>
                                )}
                            </div>
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => handleScheduleTask(idea)}>
                                    <Calendar className="mr-2 h-4 w-4" />
                                    <span>Schedule a Task</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleMakeProject(idea)}>
                                    <Briefcase className="mr-2 h-4 w-4" />
                                    <span>Convert to Project</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleArchive(idea)}>
                                <Archive className="mr-2 h-4 w-4" />
                                <span>Archive</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => handleStartEdit(idea)}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleDeleteIdea(idea.id)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Permanently
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                      </div>
                    ))
                  ) : !showNewIdeaCard ? (
                    <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                      <p>Your idea board is empty. Add an idea to get started!</p>
                    </div>
                  ) : null}
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
        <EditIdeaDialog
            isOpen={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            idea={ideaToEdit}
            onSave={handleSaveEditedIdea}
        />
    </>
  );
}
