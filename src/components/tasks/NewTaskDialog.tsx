
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { type Project, type Event as TaskEvent, type TaskStatus, type ProjectUrgency, type ProjectImportance } from '@/types/calendar-types';
import { type Contact } from '@/data/contacts';
import { useAuth } from '@/context/auth-context';
import { addTask, updateTask } from '@/services/project-service';
import { LoaderCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '@/components/ui/checkbox';

const projectSchema = z.object({
  name: z.string().min(2, { message: "Project name must be at least 2 characters." }),
  description: z.string().optional(),
  contactId: z.string().optional().nullable(),
  status: z.enum(['planning', 'active', 'on-hold', 'completed']).default('planning'),
  urgency: z.enum(['urgent', 'important', 'optional']).default('important'),
  importance: z.enum(['A', 'B', 'C']).default('B'),
});

const taskSchema = z.object({
    title: z.string().min(2, { message: "Task title is required." }),
    description: z.string().optional(),
    stepId: z.string().optional().nullable(),
    isTodoItem: z.boolean().optional(),
    urgency: z.enum(['urgent', 'important', 'optional']).default('important'),
    importance: z.enum(['A', 'B', 'C']).default('B'),
});

type ProjectFormData = z.infer<typeof projectSchema>;
type TaskFormData = z.infer<typeof taskSchema>;

interface NewTaskDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onProjectCreate?: (projectData: Omit<Project, 'id' | 'createdAt' | 'userId'>, tasks: []) => void;
  onProjectUpdate?: (project: Project, tasks: []) => void;
  onTaskCreate?: (task: TaskEvent) => void;
  onTaskUpdate?: (task: TaskEvent) => void;
  contacts?: Contact[];
  onContactsChange?: (contacts: Contact[]) => void;
  projectToEdit?: Project | null;
  taskToEdit?: TaskEvent | null; 
  projectId?: string;
  initialData?: Partial<any>;
}

const defaultProjectFormValues: ProjectFormData = {
  name: "",
  description: "",
  contactId: null,
  status: 'planning',
  urgency: 'important',
  importance: 'B',
};

const defaultTaskFormValues: TaskFormData = {
  title: "",
  description: "",
  stepId: null,
  isTodoItem: false,
  urgency: 'important',
  importance: 'B',
};


export function NewTaskDialog({
  isOpen,
  onOpenChange,
  onProjectCreate,
  onProjectUpdate,
  onTaskCreate,
  onTaskUpdate,
  contacts = [],
  onContactsChange,
  projectToEdit,
  taskToEdit,
  projectId,
  initialData,
}: NewTaskDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  
  const isTaskMode = !!projectId || !!taskToEdit || initialData?.isTodoItem;
  const isEditingProject = !!projectToEdit;
  const isEditingTask = !!taskToEdit;

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: defaultProjectFormValues,
  });

  const taskForm = useForm<TaskFormData>({
      resolver: zodResolver(taskSchema),
      defaultValues: defaultTaskFormValues,
  });

  const [isLoading, setIsLoading] = useState(false);
  
  const initialDataString = JSON.stringify(initialData);

  useEffect(() => {
    if (isOpen) {
        if (isTaskMode) {
            const defaults = taskToEdit 
              ? { title: taskToEdit.title, description: taskToEdit.description || "", stepId: taskToEdit.stepId || null, isTodoItem: taskToEdit.isTodoItem, urgency: taskToEdit.urgency || 'important', importance: taskToEdit.importance || 'B' }
              : { ...defaultTaskFormValues, ...initialData };
            taskForm.reset(defaults);
        } else {
            const defaults = projectToEdit 
                ? { 
                    ...defaultProjectFormValues,
                    ...projectToEdit,
                  }
                : { ...defaultProjectFormValues, ...initialData };
            form.reset(defaults);
        }
    }
  }, [isOpen, projectToEdit, taskToEdit, isTaskMode, initialData, form, taskForm]);

  async function onProjectSubmit(values: ProjectFormData) {
    if (!user) return;
    setIsLoading(true);

    if (isEditingProject && projectToEdit) {
        if (onProjectUpdate) {
            onProjectUpdate({ ...projectToEdit, ...values }, []);
        }
    } else {
        if (onProjectCreate) {
            onProjectCreate({ ...values, contactId: values.contactId || null }, []);
        }
    }
    
    setIsLoading(false);
    onOpenChange(false);
  }

  async function onTaskSubmit(values: TaskFormData) {
    if (!user) return;

    setIsLoading(true);
    try {
        if (isEditingTask && taskToEdit) {
            const updatedTaskData: Partial<TaskEvent> = { title: values.title, description: values.description, stepId: values.stepId, urgency: values.urgency, importance: values.importance };
            await updateTask(taskToEdit.id, updatedTaskData);
            if (onTaskUpdate) {
                onTaskUpdate({ ...taskToEdit, ...updatedTaskData });
            }
            toast({ title: "Task Updated" });
        } else {
            const newTaskData = {
                title: values.title,
                description: values.description || '',
                status: 'todo' as TaskStatus,
                position: 0, 
                projectId: projectId === 'inbox' ? null : projectId,
                stepId: values.stepId || null,
                userId: user.uid,
                isTodoItem: !!values.isTodoItem,
                urgency: values.urgency,
                importance: values.importance,
            };
            const savedTask = await addTask(newTaskData);
            if (onTaskCreate) {
                onTaskCreate(savedTask);
            }
            toast({ title: "Task Created" });
        }
        onOpenChange(false);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Failed to save task', description: error.message });
    } finally {
        setIsLoading(false);
    }
  }

  const renderProjectForm = () => (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onProjectSubmit)} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{isEditingProject ? "Edit Project" : "Create New Project"}</DialogTitle>
              <DialogDescription>
                {isEditingProject ? "Update the details for this project." : "Start by giving your new project a name and description."}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Project Name</FormLabel> <FormControl><Input placeholder="e.g., Q4 Marketing Campaign" {...field} value={field.value || ''} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField control={form.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description (Optional)</FormLabel> <FormControl><Textarea placeholder="Describe the main goal of this project" {...field} value={field.value || ''} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField control={form.control} name="contactId" render={({ field }) => ( <FormItem> <FormLabel>Client (Optional)</FormLabel> <Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue placeholder="Assign a client to this project" /></SelectTrigger></FormControl><SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select><FormMessage /> </FormItem> )} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="status" render={({ field }) => ( <FormItem> <FormLabel>Status</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="planning">In Planning</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="on-hold">On-Hold</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent></Select><FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="urgency" render={({ field }) => ( <FormItem> <FormLabel>Time Urgency</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="urgent">Urgent</SelectItem><SelectItem value="important">Important</SelectItem><SelectItem value="optional">Optional</SelectItem></SelectContent></Select><FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="importance" render={({ field }) => ( <FormItem> <FormLabel>Task Importance</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="A">A - Critical</SelectItem><SelectItem value="B">B - Standard</SelectItem><SelectItem value="C">C - Low</SelectItem></SelectContent></Select><FormMessage /> </FormItem> )} />
                </div>
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
  );

  const renderTaskForm = () => (
    <Form {...taskForm}>
        <form onSubmit={taskForm.handleSubmit(onTaskSubmit)} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{isEditingTask ? "Edit Task" : "New Task"}</DialogTitle>
              <DialogDescription>
                {isEditingTask ? "Update the details for this task." : "Add a new task."}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <FormField control={taskForm.control} name="title" render={({ field }) => ( <FormItem> <FormLabel>Title</FormLabel> <FormControl><Input placeholder="e.g., Draft homepage copy" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField control={taskForm.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description (Optional)</FormLabel> <FormControl><Textarea placeholder="Add more details about the task..." {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={taskForm.control} name="urgency" render={({ field }) => ( <FormItem> <FormLabel>Time Urgency</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="urgent">Urgent</SelectItem><SelectItem value="important">Important</SelectItem><SelectItem value="optional">Optional</SelectItem></SelectContent></Select><FormMessage /> </FormItem> )} />
                    <FormField control={taskForm.control} name="importance" render={({ field }) => ( <FormItem> <FormLabel>Task Importance</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="A">A - Critical</SelectItem><SelectItem value="B">B - Standard</SelectItem><SelectItem value="C">C - Low</SelectItem></SelectContent></Select><FormMessage /> </FormItem> )} />
                </div>
                 <FormField control={taskForm.control} name="isTodoItem" render={({ field }) => ( <FormItem className="hidden"> <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl> </FormItem> )} />
            </div>
            <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditingTask ? "Save Changes" : "Add Task"}
                </Button>
            </DialogFooter>
        </form>
    </Form>
  );

  return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
          {isTaskMode ? renderTaskForm() : renderProjectForm()}
        </DialogContent>
      </Dialog>
  );
}
