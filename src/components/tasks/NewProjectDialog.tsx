
'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
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
import { type Project, type Event as TaskEvent } from '@/types/calendar-types';
import { type Contact } from '@/data/contacts';
import { useAuth } from '@/context/auth-context';
import { addProject, updateProject } from '@/services/project-service';
import { LoaderCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const projectSchema = z.object({
  description: z.string().optional(),
  contactId: z.string().optional().nullable(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface NewProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onProjectSaved: () => void;
  contacts: Contact[];
  projectToEdit: Project | null;
}

export function NewProjectDialog({ 
    isOpen, 
    onOpenChange, 
    onProjectSaved, 
    contacts,
    projectToEdit,
}: NewProjectDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      description: "",
      contactId: null,
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (projectToEdit) {
        form.reset({
          description: projectToEdit.description || "",
          contactId: projectToEdit.contactId,
        });
      } else {
        const descriptionFromUrl = searchParams.get('description');
        form.reset({
          description: descriptionFromUrl || "",
          contactId: null,
        });
      }
    }
  }, [isOpen, projectToEdit, searchParams, form]);

  async function onSubmit(values: ProjectFormData) {
    if (!user) return;
    setIsLoading(true);
    try {
        const projectName = projectToEdit?.name || searchParams.get('title') || 'New Project';
        const projectData = {
            name: projectName,
            description: values.description,
            contactId: values.contactId === 'unassigned' ? null : values.contactId,
        };
        if (projectToEdit) {
            await updateProject(projectToEdit.id, projectData);
            toast({ title: 'Project Updated' });
        } else {
            await addProject({ ...projectData, status: 'planning', userId: user.uid, createdAt: new Date() });
            toast({ title: 'Project Created' });
        }
        onProjectSaved();
    } catch (error: any) {
        toast({ variant: 'destructive', title: "Failed to save project", description: error.message });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{projectToEdit ? 'Edit Project' : 'Test 101'}</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the main goal of this project"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Leader / Client</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "unassigned"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Assign to a contact..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unassigned">No Contact</SelectItem>
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
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                {projectToEdit ? 'Save Changes' : 'Create Project'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
