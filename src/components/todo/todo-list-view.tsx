
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDrag, useDrop } from 'react-dnd';
import { MoreVertical, Pencil, Trash2, LoaderCircle, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getTasksForUser, updateTask, deleteTask as deleteTaskFromDb, updateTaskPositions } from '@/services/todo-service';
import { type Event as TaskEvent, type TaskStatus } from '@/types/calendar-types';
import { NewTaskDialog } from '@/components/tasks/NewTaskDialog';
import { cn } from '@/lib/utils';
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

const ItemTypes = {
    TASK: 'task',
};

const TaskCard = ({ task, onEdit, onDelete }: { task: TaskEvent, onEdit: (task: TaskEvent) => void, onDelete: (task: TaskEvent) => void }) => {
    
    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.TASK,
        item: task,
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }));

    return (
        <div ref={drag} style={{ opacity: isDragging ? 0.5 : 1 }}>
            <Card className="mb-2 cursor-move">
                <CardContent className="p-3 flex items-center justify-between">
                    <div onClick={() => onEdit(task)} className="flex-1">
                        <p className={cn("font-semibold", task.status === 'done' && 'line-through text-muted-foreground')}>{task.title}</p>
                        {task.description && <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>}
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onSelect={() => onEdit(task)}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => onDelete(task)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </CardContent>
            </Card>
        </div>
    );
};

const TaskColumn = ({ title, status, tasks, onAddTask, onDropTask, onEditTask, onDeleteTask }: { title: string, status: TaskStatus, tasks: TaskEvent[], onAddTask?: () => void, onDropTask: (item: TaskEvent, newStatus: TaskStatus) => void, onEditTask: (task: TaskEvent) => void, onDeleteTask: (task: TaskEvent) => void }) => {
    
    const [{ isOver }, drop] = useDrop(() => ({
        accept: ItemTypes.TASK,
        drop: (item: TaskEvent) => onDropTask(item, status),
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
        }),
    }));

    return (
        <Card ref={drop} className={cn("flex flex-col", isOver && 'bg-primary/10')}>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{title}</CardTitle>
                {onAddTask && <Button size="icon" variant="ghost" onClick={onAddTask}><Plus className="h-4 w-4" /></Button>}
            </CardHeader>
            <CardContent className="flex-1 space-y-2">
                {tasks.map(task => (
                    <TaskCard key={task.id} task={task} onEdit={onEditTask} onDelete={onDeleteTask} />
                ))}
            </CardContent>
        </Card>
    );
};


export function ToDoListView() {
  const [tasks, setTasks] = useState<TaskEvent[]>([]);
  const [taskToEdit, setTaskToEdit] = useState<TaskEvent | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<TaskEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);

  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const loadTasks = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const userTasks = await getTasksForUser(user.uid);
      setTasks(userTasks.filter(t => !t.projectId || t.projectId === 'inbox'));
    } catch (error) {
      console.error("Failed to load tasks:", error);
      toast({
        variant: 'destructive',
        title: 'Failed to load items',
        description: 'Could not retrieve your task list.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleEditTask = (task: TaskEvent) => {
    setTaskToEdit(task);
    setIsTaskDialogOpen(true);
  };
  
  const handleAddTask = () => {
    setTaskToEdit(null);
    setIsTaskDialogOpen(true);
  };

  const handleTaskSaved = () => {
    loadTasks();
    setIsTaskDialogOpen(false);
  };

  const handleDeleteTask = async (task: TaskEvent) => {
    const originalTasks = [...tasks];
    setTasks(tasks.filter(t => t.id !== task.id));
    try {
      await deleteTaskFromDb(task.id);
    } catch (error) {
      setTasks(originalTasks);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the task.' });
    }
  };

  const onDropTask = async (item: TaskEvent, newStatus: TaskStatus) => {
      if (item.status === newStatus) return;

      const originalTasks = [...tasks];
      const updatedTasks = tasks.map(t => t.id === item.id ? { ...t, status: newStatus } : t);
      setTasks(updatedTasks);

      try {
          await updateTask(item.id, { status: newStatus });
      } catch (error) {
          setTasks(originalTasks);
          toast({ variant: 'destructive', title: 'Update failed', description: 'Could not move the task.' });
      }
  };
  
  const columns: { title: string, status: TaskStatus }[] = [
    { title: 'To Do', status: 'todo' },
    { title: 'In Progress', status: 'inProgress' },
    { title: 'Done', status: 'done' },
  ];

  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <>
      <div className="p-4 sm:p-6 flex flex-col items-center h-full">
        <header className="text-center mb-6">
          <h1 className="text-3xl font-bold font-headline text-primary">To-Do List</h1>
          <p className="text-muted-foreground">Drag and drop tasks to change their status.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl mt-6">
          {columns.map(({ title, status }) => (
            <TaskColumn
              key={status}
              title={title}
              status={status}
              tasks={tasks.filter(t => t.status === status).sort((a,b) => a.position - b.position)}
              onAddTask={status === 'todo' ? handleAddTask : undefined}
              onDropTask={onDropTask}
              onEditTask={handleEditTask}
              onDeleteTask={setTaskToDelete}
            />
          ))}
        </div>
      </div>
      
      <NewTaskDialog
        isOpen={isTaskDialogOpen}
        onOpenChange={setIsTaskDialogOpen}
        onTaskUpdate={handleTaskSaved}
        onTaskCreate={handleTaskSaved}
        taskToEdit={taskToEdit}
        projectId="inbox"
      />

       <AlertDialog open={!!taskToDelete} onOpenChange={() => setTaskToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete the task "{taskToDelete?.title}".</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => { if(taskToDelete) handleDeleteTask(taskToDelete) }} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
