
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
});

const taskSchema = z.object({
  title: z.string().min(2, { message: "Task title is required." }),
  description: z.string().optional(),
  projectId: z.string().optional().nullable(),
  stepId: z.string().optional().nullable(),
  isTodoItem: z.boolean().optional(),
  urgency: z.enum(['A - Urgent', 'B - Important', 'C - Optional']).default('B - Important'),
  importance: z.enum(['A', 'B', 'C']).default('B'),
});

type ProjectFormData = z.infer<typeof projectSchema>;
type TaskFormData = z.infer<typeof taskSchema>;

interface NewTaskDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onProjectCreate?: (projectData: Omit<Project, 'id' | 'createdAt' | 'userId'>, tasks: []) => void;
  onProjectUpdate?: (project: Project) => void;
  onTaskCreate?: (task: TaskEvent) => void;
  onTaskUpdate?: (task: TaskEvent) => void;
  contacts?: Contact[];
  onContactsChange?: (contacts: Contact[]) => void;
  projects?: Project[];
  projectToEdit?: Project | null;
  taskToEdit?: TaskEvent | null; 
  projectId?: string;
  initialData?: Partial<any>;
}

const defaultProjectFormValues: ProjectFormData = {
  name: "",
  description: "",
  contactId: null,
};

const defaultTaskFormValues: TaskFormData = {
  title: "",
  description: "",
  projectId: null,
  stepId: null,
  isTodoItem: false,
  urgency: 'B - Important',
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
  projects = [],
  projectToEdit,
  taskToEdit,
  projectId,
  initialData,
}: NewTaskDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const isTaskMode = !!projectId || !!taskToEdit || initialData?.isTodoItem;
  const isEditingProject = !!projectToEdit;
  const isEditingTask = !!taskToEdit;
  
  const projectForm = useForm<ProjectFormData>({
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
              ? { ...defaultTaskFormValues, title: taskToEdit.title, description: taskToEdit.description || "", stepId: taskToEdit.stepId || null, isTodoItem: taskToEdit.isTodoItem, urgency: taskToEdit.urgency || 'B - Important', importance: taskToEdit.importance || 'B', projectId: taskToEdit.projectId || projectId }
              : { ...defaultTaskFormValues, ...initialData, projectId: projectId };
            taskForm.reset(defaults);
        } else {
            const parsedInitialData = initialDataString ? JSON.parse(initialDataString) : {};
            const defaults = projectToEdit 
                ? { 
                    ...defaultProjectFormValues,
                    ...projectToEdit,
                  }
                : { ...defaultProjectFormValues, ...parsedInitialData };
            projectForm.reset(defaults);
        }
    }
  }, [isOpen, projectToEdit, taskToEdit, isTaskMode, initialData, projectForm, taskForm, projectId, initialDataString]);

  async function onProjectSubmit(values: ProjectFormData) {
    if (!user) return;
    setIsLoading(true);

    try {
        if (isEditingProject && projectToEdit) {
            if (onProjectUpdate) {
                onProjectUpdate({ ...projectToEdit, ...values });
            }
        } else {
            if (onProjectCreate) {
                await onProjectCreate({ ...values, status: 'planning', urgency: 'important', importance: 'B' }, []);
            }
        }
        onOpenChange(false);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Failed to save project', description: error.message });
    } finally {
        setIsLoading(false);
    }
  }

  async function onTaskSubmit(values: TaskFormData) {
    if (!user) return;

    setIsLoading(true);
    try {
        const urgencyMap = { 'A - Urgent': 'urgent', 'B - Important': 'important', 'C - Optional': 'optional' };
        const finalUrgency = urgencyMap[values.urgency] as TaskEvent['urgency'];

        if (isEditingTask && taskToEdit) {
            const updatedTaskData: Partial<TaskEvent> = { title: values.title, description: values.description, projectId: values.projectId === 'unassigned' ? null : values.projectId, stepId: values.stepId, urgency: finalUrgency, importance: values.importance };
            await updateTask(taskToEdit.id, updatedTaskData);
            if (onTaskUpdate) {
                onTaskUpdate({ ...taskToEdit, ...updatedTaskData });
            }
            toast({ title: "Task Updated" });
        } else {
            const newTaskData: Omit<TaskEvent, 'id'> = {
                title: values.title,
                description: values.description || '',
                status: 'todo',
                position: 0, 
                projectId: values.projectId === 'inbox' || values.projectId === 'unassigned' ? null : values.projectId,
                stepId: values.stepId || null,
                userId: user.uid,
                isTodoItem: !!values.isTodoItem,
                urgency: finalUrgency,
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
    <Form {...projectForm}>
        <form onSubmit={projectForm.handleSubmit(onProjectSubmit)} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{isEditingProject ? "Edit Project" : "Create New Project"}</DialogTitle>
              <DialogDescription>
                {isEditingProject ? "Update the details for this project." : "Start by giving your new project a name and description."}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <FormField
                    control={projectForm.control}
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
                <FormField control={projectForm.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description (Optional)</FormLabel> <FormControl><Textarea placeholder="Describe the main goal of this project" {...field} value={field.value || ''} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField
                    control={projectForm.control}
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
                <FormField
                    control={taskForm.control}
                    name="projectId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Project</FormLabel>
                        <Select
                        onValueChange={field.onChange}
                        value={field.value || 'unassigned'}
                        >
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Assign to a project..." />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="unassigned">
                              Unassigned Tasks / To-Do List
                            </SelectItem>
                            {projects.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={taskForm.control} name="urgency" render={({ field }) => ( <FormItem> <FormLabel>Time Urgency</FormLabel> <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="A - Urgent">A - Urgent</SelectItem><SelectItem value="B - Important">B - Important</SelectItem><SelectItem value="C - Optional">C - Optional</SelectItem></SelectContent></Select><FormMessage /> </FormItem> )} />
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
