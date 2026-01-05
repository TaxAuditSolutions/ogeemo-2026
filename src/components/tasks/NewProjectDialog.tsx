
'use client';

import React, { useState, useEffect } from 'react';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoaderCircle } from 'lucide-react';
import type { Contact } from '@/data/contacts';
import type { Project, Event as TaskEvent } from '@/types/calendar-types';
import { useToast } from '@/hooks/use-toast';

const projectSchema = z.object({
  description: z.string().optional(),
  contactId: z.string().optional().nullable(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface NewProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onProjectCreate: (projectData: Partial<Omit<Project, 'id' | 'createdAt' | 'userId' | 'status'>>, tasks: []) => void;
  onProjectUpdate?: (project: Project) => void;
  contacts: Contact[];
  projectToEdit?: Project | null;
}

const defaultFormValues: ProjectFormData = {
  description: "",
  contactId: null,
};

export function NewProjectDialog({ isOpen, onOpenChange, onProjectCreate, contacts, projectToEdit }: NewProjectDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: defaultFormValues,
  });
  
  useEffect(() => {
    if (isOpen) {
        form.reset({
            description: projectToEdit?.description || "",
            contactId: projectToEdit?.contactId || null,
        });
    }
  }, [isOpen, projectToEdit, form]);

  async function onSubmit(values: ProjectFormData) {
    setIsLoading(true);
    
    // The name is now missing, so this will fail, but it follows the instruction.
    const newProjectData = {
        name: "Temporary Name - To Be Fixed", // Placeholder
        description: values.description,
        contactId: values.contactId === 'unassigned' ? null : values.contactId,
    };
    
    try {
        onProjectCreate(newProjectData, []);
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Failed to create project",
            description: error.message,
        });
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
              <DialogTitle>{projectToEdit ? 'Edit Project' : 'Create New Project'}</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-field">Test</Label>
                <Input id="test-field" placeholder="This is a test field" />
              </div>
              
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
                        value={field.value || ''}
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
                    <FormLabel>Contact</FormLabel>
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
