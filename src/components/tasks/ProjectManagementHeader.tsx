
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Briefcase, ListChecks, Info, Plus, ListTodo, Route } from 'lucide-react';
import { NewTaskDialog } from './NewTaskDialog';
import { useAuth } from '@/context/auth-context';
import { addProject } from '@/services/project-service';
import { type Project, type Event as TaskEvent } from '@/types/calendar-types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getContacts, type Contact } from '@/services/contact-service';

export function ProjectManagementHeader({ projectId }: { projectId?: string }) {
    const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        async function loadContacts() {
            if (user) {
                const fetchedContacts = await getContacts(user.uid);
                setContacts(fetchedContacts);
            }
        }
        loadContacts();
    }, [user]);

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
    
    return (
        <>
            <div className="flex justify-center gap-2 pb-4">
                <Button asChild variant="outline">
                    <Link href="/projects/all">
                        <Briefcase className="mr-2 h-4 w-4" /> Project List
                    </Link>
                </Button>
                <Button asChild variant="outline">
                    <Link href="/project-status">
                        <ListChecks className="mr-2 h-4 w-4" /> Project Status
                    </Link>
                </Button>
                 <Button asChild variant="outline">
                    <Link href="/all-project-tasks">
                        <ListTodo className="mr-2 h-4 w-4" /> All Tasks
                    </Link>
                </Button>
                 <Button asChild variant="ghost" size="icon">
                    <Link href="/projects/instructions">
                        <Info className="h-5 w-5" />
                        <span className="sr-only">Project Management Instructions</span>
                    </Link>
                </Button>
            </div>
            <NewTaskDialog
                isOpen={isNewProjectDialogOpen}
                onOpenChange={setIsNewProjectDialogOpen}
                onProjectCreate={handleProjectCreated}
                contacts={contacts}
                onContactsChange={setContacts}
                projectToEdit={null}
            />
        </>
    );
}
