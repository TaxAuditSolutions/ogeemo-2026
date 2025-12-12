
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, LoaderCircle, MoreVertical, Edit, Trash2, ArrowUpDown, Briefcase, Check, ChevronsUpDown, Folder, Calendar, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getProjects, getTasksForUser, updateTask, deleteTask, deleteTasks, updateTasksStatus } from '@/services/project-service';
import { type Project, type Event as TaskEvent, type TaskStatus } from '@/types/calendar';
import { getContacts, type Contact } from '@/services/contact-service';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';
import { ProjectManagementHeader } from './ProjectManagementHeader';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { TaskCreationInfoDialog } from './task-creation-info-dialog';

const statusDisplayMap: Record<string, string> = {
    todo: 'To Do',
    inProgress: 'In Progress',
    done: 'Done',
};
const statusColorMap: Record<string, string> = {
    todo: 'bg-yellow-100 text-yellow-800',
    inProgress: 'bg-blue-100 text-blue-800',
    done: 'bg-green-100 text-green-800',
};


const TaskListItem = ({ task, project, onEdit, onDelete, onAssignProject, projects, isSelected, onToggleSelect }: { task: TaskEvent, project: Project | undefined, onEdit: (task: TaskEvent) => void, onDelete: (task: TaskEvent) => void, onAssignProject: (taskId: string, projectId: string | null) => void, projects: Project[], isSelected: boolean, onToggleSelect: (taskId: string) => void }) => {
    return (
        <div className="group flex items-center p-3 border-b hover:bg-muted/50 transition-colors">
            <div className="flex items-center w-[50px] pl-4">
                <Checkbox checked={isSelected} onCheckedChange={() => onToggleSelect(task.id)} />
            </div>
            <div className="flex-1 grid grid-cols-4 items-center gap-4 cursor-pointer" onClick={() => onEdit(task)}>
                <div className="col-span-1">
                    <p className="font-medium text-sm">{task.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                </div>
                 <div className="col-span-1">
                     <p className="text-sm text-muted-foreground">{project?.name || "Unassigned"}</p>
                </div>
                 <div className="col-span-1 text-center">
                    <Badge variant="outline" className={cn(statusColorMap[task.status] || 'bg-gray-100 text-gray-800')}>
                        {statusDisplayMap[task.status] || 'Unknown'}
                    </Badge>
                </div>
                 <div className="col-span-1 text-center">
                    <p className="text-sm text-muted-foreground">
                        {task.start ? format(new Date(task.start), 'PP') : 'Not scheduled'}
                    </p>
                </div>
            </div>
            <div className="pl-4 w-[52px]">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => onEdit(task)}>
                            <Edit className="mr-2 h-4 w-4"/> Open / Edit
                        </DropdownMenuItem>
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <Folder className="mr-2 h-4 w-4" />
                                Assign to Project
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem onSelect={() => onAssignProject(task.id, null)}>
                                        <Check className={cn("mr-2 h-4 w-4", !task.projectId ? "opacity-100" : "opacity-0")} />
                                        Unassigned
                                    </DropdownMenuItem>
                                    {projects.map(p => (
                                        <DropdownMenuItem key={p.id} onSelect={() => onAssignProject(task.id, p.id)}>
                                            <Check className={cn("mr-2 h-4 w-4", task.projectId === p.id ? "opacity-100" : "opacity-0")} />
                                            {p.name}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => onDelete(task)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4"/> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
};


export default function AllProjectTasksView() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [tasks, setTasks] = useState<TaskEvent[]>([]);
    const [taskToDelete, setTaskToDelete] = useState<TaskEvent | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
    const [isProjectPopoverOpen, setIsProjectPopoverOpen] = useState(false);
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
    const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);
    const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
    
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        async function loadInitialData() {
            if (!user) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                const [fetchedProjects, fetchedTasks] = await Promise.all([
                    getProjects(user.uid),
                    getTasksForUser(user.uid),
                ]);
                setProjects(fetchedProjects);
                setTasks(fetchedTasks);
            } catch (error: any) {
                 toast({ variant: 'destructive', title: 'Failed to load data', description: error.message });
            } finally {
                setIsLoading(false);
            }
        }
        loadInitialData();
    }, [user, toast]);
    
    const handleEditTask = (task: TaskEvent) => {
        router.push(`/master-mind?eventId=${task.id}`);
    };

    const handleAssignProject = async (taskId: string, projectId: string | null) => {
        const originalTasks = [...tasks];
        const taskToUpdate = tasks.find(t => t.id === taskId);
        if (!taskToUpdate) return;
        
        const updatedTask = { ...taskToUpdate, projectId };
        setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
        
        try {
            await updateTask(taskId, { projectId });
            const projectName = projectId ? projects.find(p => p.id === projectId)?.name : 'Unassigned';
            toast({ title: 'Task Reassigned', description: `Task moved to "${projectName}".`});
        } catch (error: any) {
            setTasks(originalTasks);
            toast({ variant: 'destructive', title: 'Failed to reassign task', description: error.message });
        }
    };

    const handleConfirmDelete = async () => {
        if (!taskToDelete) return;
        const originalTasks = [...tasks];
        setTasks(prev => prev.filter(t => t.id !== taskToDelete.id));
        try {
            await deleteTask(taskToDelete.id);
            toast({ title: 'Task Deleted' });
        } catch (error: any) {
            setTasks(originalTasks);
            toast({ variant: 'destructive', title: 'Failed to delete task', description: error.message });
        } finally {
            setTaskToDelete(null);
        }
    };

    const filteredTasks = useMemo(() => {
        const allTasks = tasks.filter(task => !task.ritualType); // Filter out rituals
        if (selectedProjectId === 'all') return allTasks;
        if (selectedProjectId === 'unassigned') return allTasks.filter(t => !t.projectId);
        return allTasks.filter(t => t.projectId === selectedProjectId);
    }, [tasks, selectedProjectId]);

    const sortedTasks = useMemo(() => {
        return [...filteredTasks].sort((a, b) => {
            const dateA = a.start ? new Date(a.start).getTime() : 0;
            const dateB = b.start ? new Date(b.start).getTime() : 0;
            return dateB - dateA;
        });
    }, [filteredTasks]);

    const allProjectsOption = { id: 'all', name: 'All Projects' };
    const unassignedOption = { id: 'unassigned', name: 'Unassigned Tasks' };
    const projectOptions = [allProjectsOption, unassignedOption, ...projects];

    const handleToggleSelect = (taskId: string) => {
        setSelectedTaskIds(prev =>
            prev.includes(taskId)
                ? prev.filter(id => id !== taskId)
                : [...prev, id]
        );
    };

    const handleToggleSelectAll = (checked: boolean | 'indeterminate') => {
        if (checked) {
            setSelectedTaskIds(sortedTasks.map(t => t.id));
        } else {
            setSelectedTaskIds([]);
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedTaskIds.length === 0) return;
        
        const originalTasks = [...tasks];
        setTasks(prev => prev.filter(t => !selectedTaskIds.includes(t.id)));

        try {
            await deleteTasks(selectedTaskIds);
            toast({ title: `${selectedTaskIds.length} Task(s) Deleted` });
            setSelectedTaskIds([]);
        } catch (error: any) {
            setTasks(originalTasks);
            toast({ variant: 'destructive', title: 'Bulk Delete Failed', description: error.message });
        } finally {
            setIsBulkDeleteAlertOpen(false);
        }
    };

    const handleMarkSelectedDone = async () => {
        if (selectedTaskIds.length === 0) return;
        
        const originalTasks = [...tasks];
        setTasks(prev => prev.map(t => selectedTaskIds.includes(t.id) ? { ...t, status: 'done' } : t));
        
        try {
            await updateTasksStatus(selectedTaskIds, 'done');
            toast({ title: 'Tasks Updated', description: `${selectedTaskIds.length} task(s) marked as done.` });
            setSelectedTaskIds([]);
        } catch (error: any) {
            setTasks(originalTasks);
            toast({ variant: 'destructive', title: 'Bulk Update Failed', description: error.message });
        }
    };
    
    const allVisibleSelected = sortedTasks.length > 0 && sortedTasks.every(t => selectedTaskIds.includes(t.id));
    const someVisibleSelected = selectedTaskIds.length > 0 && !allVisibleSelected;


    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full pt-16">
                <LoaderCircle className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    return (
        <>
            <div className="p-4 sm:p-6 flex flex-col h-full items-center">
                <header className="text-center mb-6">
                    <div className="flex items-center justify-center gap-2">
                        <h1 className="text-3xl font-bold font-headline text-primary">All Project Tasks</h1>
                        <Button variant="ghost" size="icon" onClick={() => setIsInfoDialogOpen(true)}>
                            <Info className="h-5 w-5 text-muted-foreground" />
                        </Button>
                    </div>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        A list of all tasks and events, including those scheduled on your calendar.
                    </p>
                </header>
                <ProjectManagementHeader />

                <Card className="w-full max-w-6xl">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                               <CardTitle>Task List</CardTitle>
                               {selectedTaskIds.length > 0 && (
                                   <div className="flex items-center gap-2">
                                       <Button variant="outline" size="sm" onClick={handleMarkSelectedDone}>Mark as Done</Button>
                                       <Button variant="destructive" size="sm" onClick={() => setIsBulkDeleteAlertOpen(true)}>Delete Selected</Button>
                                       <span className="text-sm text-muted-foreground">{selectedTaskIds.length} selected</span>
                                   </div>
                               )}
                            </div>
                            <div className="w-64">
                                <Popover open={isProjectPopoverOpen} onOpenChange={setIsProjectPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" className="w-full justify-between">
                                            {projectOptions.find(p => p.id === selectedProjectId)?.name || "Select project..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command><CommandInput placeholder="Search projects..." /><CommandList><CommandEmpty>No project found.</CommandEmpty><CommandGroup>{projectOptions.map(p => (<CommandItem key={p.id} value={p.name} onSelect={() => { setSelectedProjectId(p.id); setIsProjectPopoverOpen(false); }}> <Check className={cn("mr-2 h-4 w-4", selectedProjectId === p.id ? "opacity-100" : "opacity-0")}/>{p.name}</CommandItem>))}</CommandGroup></CommandList></Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="border-t">
                            <div className="flex items-center p-4 border-b bg-muted/50">
                                <div className="flex items-center w-[50px] pl-4">
                                    <Checkbox
                                        checked={allVisibleSelected ? true : (someVisibleSelected ? 'indeterminate' : false)}
                                        onCheckedChange={() => handleToggleSelectAll(!allVisibleSelected)}
                                        aria-label="Select all visible tasks"
                                    />
                                </div>
                                <div className="flex-1 grid grid-cols-4 items-center gap-4">
                                    <div className="col-span-1"><p className="font-semibold text-sm">Task Title</p></div>
                                    <div className="col-span-1"><p className="font-semibold text-sm">Project</p></div>
                                    <div className="col-span-1 text-center"><p className="font-semibold text-sm">Status</p></div>
                                    <div className="col-span-1 text-center"><p className="font-semibold text-sm">Date</p></div>
                                </div>
                                <div className="pl-4 w-[52px]" />
                            </div>
                            <div>
                                {sortedTasks.length > 0 ? (
                                    sortedTasks.map((task) => (
                                        <TaskListItem
                                            key={task.id}
                                            task={task}
                                            project={projects.find(p => p.id === task.projectId)}
                                            onEdit={handleEditTask}
                                            onDelete={setTaskToDelete}
                                            onAssignProject={handleAssignProject}
                                            projects={projects}
                                            isSelected={selectedTaskIds.includes(task.id)}
                                            onToggleSelect={handleToggleSelect}
                                        />
                                    ))
                                ) : (
                                    <div className="text-center p-16 text-muted-foreground">
                                        <Briefcase className="mx-auto h-12 w-12" />
                                        <p className="mt-4">No tasks found for this selection.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
             <AlertDialog open={!!taskToDelete} onOpenChange={() => setTaskToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action will permanently delete the task: "{taskToDelete?.title}".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={isBulkDeleteAlertOpen} onOpenChange={setIsBulkDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete {selectedTaskIds.length} task(s). This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <TaskCreationInfoDialog isOpen={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen} />
        </>
    );
}
