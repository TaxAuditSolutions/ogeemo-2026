
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

const projectSchema = z.object({
  name: z.string(), // Keep in schema to prevent errors, but no field will be rendered
  description: z.string().optional(),
  contactId: z.string().optional().nullable(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface NewProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onProjectCreate: (projectData: Omit<Project, 'id' | 'createdAt' | 'userId' | 'status'>, tasks: Omit<TaskEvent, 'id' | 'userId' | 'projectId'>[]) => void;
  contacts: Contact[];
}

const defaultFormValues: ProjectFormData = {
  name: "",
  description: "",
  contactId: null,
};

export function NewProjectDialog({ isOpen, onOpenChange, onProjectCreate, contacts }: NewProjectDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: defaultFormValues,
  });

  useEffect(() => {
    if (isOpen) {
        form.reset(defaultFormValues);
    }
  }, [isOpen, form]);

  async function onSubmit(values: ProjectFormData) {
    // Logic is kept but will not be triggered without a submit button for the form.
    // This will be addressed in the next steps as instructed.
    setIsLoading(true);
    const projectData = {
        name: values.name,
        description: values.description,
        contactId: values.contactId === 'unassigned' ? null : values.contactId,
    };
    onProjectCreate(projectData, []);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              {/* The "Test" field has been removed as per your instruction. */}
              
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
                Create Project
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
