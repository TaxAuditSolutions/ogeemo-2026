'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { useAuth } from '@/context/auth-context';
import { addTask, updateTask } from '@/services/project-service';
import { LoaderCircle, Calendar as CalendarIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '@/components/ui/checkbox';

const taskSchema = z.object({
  title: z.string().min(2, { message: "Task title is required." }),
  description: z.string().optional(),
  projectId: z.string().optional().nullable(),
  stepId: z.string().optional().nullable(),
  isTodoItem: z.boolean().optional(),
  urgency: z.enum(['A - Urgent', 'B - Important', 'C - Optional']).default('B - Important'),
  importance: z.enum(['A', 'B', 'C']).default('B'),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface CreateTaskDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onTaskCreate?: (task: TaskEvent) => void;
  onTaskUpdate?: (task: TaskEvent) => void;
  projects?: Project[];
  initialData?: Partial<any>;
  taskToEdit?: TaskEvent | null; 
  projectId?: string;
}

const defaultTaskFormValues: TaskFormData = {
  title: "",
  description: "",
  projectId: null,
  stepId: null,
  isTodoItem: false,
  urgency: 'B - Important',
  importance: 'B',
};

export function CreateTaskDialog({
  isOpen,
  onOpenChange,
  onTaskCreate,
  onTaskUpdate,
  projects = [],
  initialData = {},
  taskToEdit,
  projectId,
}: CreateTaskDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: defaultTaskFormValues,
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
        if (taskToEdit) {
            const urgencyMap: Record<ProjectUrgency, TaskFormData['urgency']> = {
                urgent: 'A - Urgent',
                important: 'B - Important',
                optional: 'C - Optional',
            };

            form.reset({
                ...defaultTaskFormValues,
                title: taskToEdit.title,
                description: taskToEdit.description || "",
                stepId: taskToEdit.stepId || null,
                isTodoItem: taskToEdit.isTodoItem,
                urgency: taskToEdit.urgency ? urgencyMap[taskToEdit.urgency] : 'B - Important',
                importance: taskToEdit.importance || 'B',
                projectId: taskToEdit.projectId,
            });
        } else {
            const defaultProjectId = initialData?.isTodoItem ? null : (projectId || initialData?.projectId || 'unassigned');
            form.reset({ ...defaultTaskFormValues, ...initialData, projectId: defaultProjectId });
        }
    }
}, [isOpen, taskToEdit, projectId, initialData, form]);


  async function onSubmit(values: TaskFormData) {
    if (!user) return;

    setIsLoading(true);
    try {
        const urgencyMap = { 'A - Urgent': 'urgent', 'B - Important': 'important', 'C - Optional': 'optional' };
        const finalUrgency = urgencyMap[values.urgency] as TaskEvent['urgency'];

        if (taskToEdit) {
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

  const handleScheduleToCalendar = () => {
    const values = form.getValues();
    const query = new URLSearchParams();
    if (values.title) query.append('title', values.title);
    if (values.description) query.append('notes', values.description);
    if (values.projectId && values.projectId !== 'unassigned') {
        query.append('projectId', values.projectId);
    }
    router.push(`/master-mind?${query.toString()}`);
    onOpenChange(false);
  };

  const isEditingTask = !!taskToEdit;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{taskToEdit ? "Edit Task" : "New Task"}</DialogTitle>
              <DialogDescription>
                {taskToEdit ? "Update the details for this task." : "Add a new task."}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => ( <FormItem> <FormLabel>Title</FormLabel> <FormControl><Input placeholder="e.g., Draft homepage copy" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
              <FormField control={form.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description (Optional)</FormLabel> <FormControl><Textarea placeholder="Add more details about the task..." {...field} /></FormControl> <FormMessage /> </FormItem> )} />
              <FormField
                control={form.control}
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
                <FormField control={form.control} name="urgency" render={({ field }) => ( <FormItem> <FormLabel>Time Urgency</FormLabel> <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="A - Urgent">A - Urgent</SelectItem><SelectItem value="B - Important">B - Important</SelectItem><SelectItem value="C - Optional">C - Optional</SelectItem></SelectContent></Select><FormMessage /> </FormItem> )} />
                <FormField control={form.control} name="importance" render={({ field }) => ( <FormItem> <FormLabel>Task Importance</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="A">A - Critical</SelectItem><SelectItem value="B">B - Standard</SelectItem><SelectItem value="C">C - Low</SelectItem></SelectContent></Select><FormMessage /> </FormItem> )} />
              </div>
                 <FormField control={form.control} name="isTodoItem" render={({ field }) => ( <FormItem className="hidden"> <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl> </FormItem> )} />
            </div>
            <DialogFooter className="flex flex-col sm:flex-row items-center gap-2 sm:justify-between">
              <Button type="button" variant="outline" onClick={handleScheduleToCalendar} disabled={isLoading} className="w-full sm:w-auto">
                <CalendarIcon className="mr-2 h-4 w-4" /> Schedule to Calendar
              </Button>
              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditingTask ? "Save Changes" : "Add Task"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
