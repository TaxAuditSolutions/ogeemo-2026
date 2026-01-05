
'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { type Project } from '@/types/calendar-types';
import { type Contact } from '@/data/contacts';
import { useAuth } from '@/context/auth-context';
import { LoaderCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const projectSchema = z.object({
  name: z.string().min(2, { message: "Project name must be at least 2 characters." }),
  description: z.string().optional(),
  contactId: z.string().optional().nullable(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface NewProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onProjectCreate: (projectData: Omit<Project, 'id' | 'createdAt' | 'userId'>) => void;
  contacts: Contact[];
  projectToEdit: Project | null;
  initialData?: Partial<Project>;
}

const defaultProjectFormValues: ProjectFormData = {
  name: "",
  description: "",
  contactId: null,
};

export function NewProjectDialog({
  isOpen,
  onOpenChange,
  onProjectCreate,
  contacts = [],
  projectToEdit,
  initialData = {},
}: NewProjectDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: defaultProjectFormValues,
  });

  const [isLoading, setIsLoading] = useState(false);
  
  const initialDataString = JSON.stringify(initialData);
  const projectToEditString = JSON.stringify(projectToEdit);

  useEffect(() => {
    if (isOpen) {
        const parsedInitialData = initialDataString ? JSON.parse(initialDataString) : {};
        const parsedProjectToEdit = projectToEditString ? JSON.parse(projectToEditString) : null;

        const defaults = parsedProjectToEdit
            ? { ...defaultProjectFormValues, ...parsedProjectToEdit }
            : { ...defaultProjectFormValues, ...parsedInitialData };
        
        form.reset(defaults);
    }
  }, [isOpen, projectToEditString, initialDataString, form]);

  async function onSubmit(values: ProjectFormData) {
    if (!user) return;
    setIsLoading(true);

    try {
        if (projectToEdit) {
            // Update logic will be handled later if needed
            // For now, this dialog only creates new projects
        } else {
            onProjectCreate({ 
                ...values, 
                status: 'planning', 
                urgency: 'important', 
                importance: 'B', 
                contactId: values.contactId === 'unassigned' ? null : values.contactId 
            });
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Failed to save project', description: error.message });
    } finally {
        setIsLoading(false);
    }
  }

  const isEditingProject = !!projectToEdit;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{isEditingProject ? "Edit Project" : "Create New Project"}</DialogTitle>
              <DialogDescription>
                {isEditingProject ? "Update the details for this project." : "Start by giving your new project a name and description."}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Project Name</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Q4 Marketing Campaign" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField control={form.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description (Optional)</FormLabel> <FormControl><Textarea placeholder="Describe the main goal of this project" {...field} value={field.value || ''} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField
                    control={form.control}
                    name="contactId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Client</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Assign to a client..." />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="unassigned">No Client</SelectItem>
                            {contacts.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
            <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditingProject ? "Save Changes" : "Save Project"}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
