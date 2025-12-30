'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { useAuth } from '@/context/auth-context';
import { addTask } from '@/services/project-service';
import { LoaderCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const taskSchema = z.object({
  title: z.string().min(2, { message: "Task title is required." }),
  description: z.string().optional(),
  projectId: z.string().optional().nullable(),
  urgency: z.enum(['A - Urgent', 'B - Important', 'C - Optional']).default('B - Important'),
  importance: z.enum(['A', 'B', 'C']).default('B'),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface CreateTaskDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onTaskCreate: (task: TaskEvent) => void;
  projects?: Project[];
  initialData?: Partial<any>;
}

const defaultTaskFormValues: TaskFormData = {
  title: "",
  description: "",
  projectId: null,
  urgency: 'B - Important',
  importance: 'B',
};

export function CreateTaskDialog({
  isOpen,
  onOpenChange,
  onTaskCreate,
  projects = [],
  initialData = {},
}: CreateTaskDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: defaultTaskFormValues,
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      form.reset({ ...defaultTaskFormValues, ...initialData });
    }
  }, [isOpen, initialData, form]);

  async function onSubmit(values: TaskFormData) {
    if (!user) return;

    setIsLoading(true);
    try {
      const urgencyMap = { 'A - Urgent': 'urgent', 'B - Important': 'important', 'C - Optional': 'optional' };
      const finalUrgency = urgencyMap[values.urgency];

      const newTaskData = {
        title: values.title,
        description: values.description || '',
        status: 'todo' as const,
        position: 0,
        projectId: values.projectId === 'inbox' ? null : values.projectId,
        userId: user.uid,
        urgency: finalUrgency,
        importance: values.importance,
      };
      const savedTask = await addTask(newTaskData as Omit<TaskEvent, 'id'>);
      if (onTaskCreate) {
        onTaskCreate(savedTask);
      }
      toast({ title: "Task Created" });
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to save task', description: error.message });
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
              <DialogTitle>Add Task</DialogTitle>
              <DialogDescription>
                Add a new task to the selected project.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => ( <FormItem> <FormLabel>Title</FormLabel> <FormControl><Input placeholder="e.g., Draft homepage copy" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
              <FormField control={form.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description (Optional)</FormLabel> <FormControl><Textarea placeholder="Add more details about the task..." {...field} /></FormControl> <FormMessage /> </FormItem> )} />
              <FormField control={form.control} name="projectId" render={({ field }) => ( <FormItem> <FormLabel>Project</FormLabel> <Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue placeholder="Assign to a project..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="inbox">Action Items (Inbox)</SelectItem>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select><FormMessage /> </FormItem> )} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="urgency" render={({ field }) => ( <FormItem> <FormLabel>Urgency</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="A - Urgent">A - Urgent</SelectItem><SelectItem value="B - Important">B - Important</SelectItem><SelectItem value="C - Optional">C - Optional</SelectItem></SelectContent></Select><FormMessage /> </FormItem> )} />
                <FormField control={form.control} name="importance" render={({ field }) => ( <FormItem> <FormLabel>Importance</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="A">A - Critical</SelectItem><SelectItem value="B">B - Standard</SelectItem><SelectItem value="C">C - Low</SelectItem></SelectContent></Select><FormMessage /> </FormItem> )} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                Add Task
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
