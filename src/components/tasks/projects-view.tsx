
"use client";

import React from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Briefcase,
  ListChecks,
  Inbox,
  Plus,
  Info,
  ListTodo,
} from 'lucide-react';
import { NewTaskDialog } from './NewTaskDialog';
import { useAuth } from '@/context/auth-context';
import { addProject } from '@/services/project-service';
import { getContacts, type Contact } from '@/services/contact-service';
import { type Project, type Event as TaskEvent } from '@/types/calendar-types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { ProjectManagementHeader } from './ProjectManagementHeader';

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  cta: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, description, href, cta }) => (
  <Card className="flex flex-col">
    <CardHeader>
      <div className="flex items-start gap-4">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="mt-1">{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="flex-1" />
    <CardFooter>
      <Button asChild className="w-full">
        <Link href={href}>
          {cta}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </CardFooter>
  </Card>
);

export function ProjectsView() {
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = React.useState(false);
  const [initialDialogData, setInitialDialogData] = React.useState({});
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  React.useEffect(() => {
    async function loadContacts() {
        if (user) {
            try {
                const fetchedContacts = await getContacts(user.uid);
                setContacts(fetchedContacts);
            } catch (error) {
                console.error("Failed to load contacts for Project Hub:", error);
                toast({
                    variant: 'destructive',
                    title: 'Failed to load contacts',
                    description: 'Could not retrieve client list for the new project form.',
                });
            }
        }
    }
    loadContacts();
  }, [user, toast]);

  const handleNewProjectClick = () => {
      setInitialDialogData({}); // Clear any previous initial data
      setIsNewProjectDialogOpen(true);
  };

  const handleProjectCreated = async (projectData: Omit<Project, 'id' | 'createdAt' | 'userId'>, tasks: Omit<TaskEvent, 'id' | 'userId' | 'projectId'>[]) => {
      if (!user) return;
      try {
          const newProject = await addProject({ ...projectData, status: 'planning', userId: user.uid, createdAt: new Date() });
          toast({ title: "Project Created", description: `"${newProject.name}" has been successfully created.` });
          router.push(`/projects/${newProject.id}/tasks`); // Navigate to the new project board
      } catch (error: any) {
          toast({ variant: "destructive", title: "Failed to create project", description: error.message });
      }
  };

  const features = [
    { icon: Briefcase, title: "Project List", description: "A comprehensive list of every project. Use this view to edit project details.", href: "/projects/all", cta: "View Project List" },
    { icon: ListChecks, title: "Status Board", description: "A Kanban-style board to visualize project status and quickly assess your workload.", href: "/project-status", cta: "Go to Status Board" },
    { icon: ListTodo, title: "To-Do List", description: "A simple place to quickly capture your tasks and ideas.", href: "/to-do", cta: "Go to To-Do List" },
    { icon: ListTodo, title: "All Project Tasks", description: "A list of all tasks and events, including those scheduled on your calendar.", href: "/all-project-tasks", cta: "Open Tasks List" },
  ];

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6">
        <header className="text-center mb-6">
          <h1 className="text-3xl font-bold font-headline text-primary">
            Project Hub
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Your central command for managing projects and tasks, from high-level planning to daily execution.
          </p>
        </header>

        <ProjectManagementHeader />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
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
