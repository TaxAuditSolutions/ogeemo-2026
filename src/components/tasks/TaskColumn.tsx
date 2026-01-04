
'use client';

import React, { useState } from 'react';
import { useDrop } from 'react-dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type Event as TaskEvent, type TaskStatus, type ProjectStep } from '@/types/calendar';
import { TaskCard } from './TaskCard';
import { cn } from '@/lib/utils';
import { Checkbox } from '../ui/checkbox';
import { ItemTypes as StepItemTypes } from './DraggableStep';
import { Input } from '../ui/input';


interface TaskColumnProps {
  status: TaskStatus;
  tasks: TaskEvent[];
  onAddTask?: () => void; // Changed to not take arguments, it will just trigger the dialog
  onDropTask: (item: TaskEvent | Partial<ProjectStep>, newStatus: TaskStatus) => void;
  onMoveCard: (dragId: string, hoverId: string) => void;
  onTaskDelete: (taskId: string) => void;
  onToggleComplete: (taskId: string) => void;
  onEdit: (task: TaskEvent) => void;
  onMakeProject: (task: TaskEvent) => void;
  onArchive: (task: TaskEvent) => void;
  onSchedule?: (task: TaskEvent) => void;
  selectedTaskIds: string[];
  onToggleSelect: (taskId: string, event?: React.MouseEvent) => void;
  onToggleSelectAll: (status: TaskStatus) => void;
}

const columnTitles: Record<TaskStatus, string> = {
  todo: 'To Do',
  inProgress: 'In Progress',
  done: 'Done',
};

export function TaskColumn({
  status,
  tasks,
  onAddTask,
  onDropTask,
  onMoveCard,
  onTaskDelete,
  onToggleComplete,
  onEdit,
  onMakeProject,
  onArchive,
  onSchedule,
  selectedTaskIds,
  onToggleSelect,
  onToggleSelectAll,
}: TaskColumnProps) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ['task', StepItemTypes.STEP],
    drop: (item: TaskEvent | Partial<ProjectStep>) => {
      onDropTask(item, status);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  const columnTaskIds = React.useMemo(() => tasks.map(t => t.id), [tasks]);
  const selectedInColumn = selectedTaskIds.filter(id => columnTaskIds.includes(id));

  const allInColumnSelected = tasks.length > 0 && selectedInColumn.length === tasks.length;
  const someInColumnSelected = selectedInColumn.length > 0 && !allInColumnSelected;

  return (
    <Card ref={drop} className={cn("flex flex-col", isOver && canDrop && "bg-primary/10")}>
      <CardHeader className="flex flex-row items-center justify-between p-4">
        <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{columnTitles[status]} <span className="text-sm font-normal text-muted-foreground">({tasks.length})</span></CardTitle>
        </div>
         {status === 'todo' && onAddTask && (
            <Button size="sm" className="h-8 py-1 px-2" variant="outline" onClick={onAddTask}>
                <Plus className="mr-2 h-4 w-4" />
                Add Task
            </Button>
         )}
      </CardHeader>
      <ScrollArea className="flex-1">
        <CardContent className="p-4 pt-0 space-y-3">
          {tasks.map((task) => (
            <TaskCard 
                key={task.id} 
                task={task} 
                onMoveCard={onMoveCard}
                onEdit={onEdit}
                onTaskDelete={() => onTaskDelete(task.id)}
                onToggleComplete={onToggleComplete}
                onMakeProject={onMakeProject}
                onArchive={onArchive}
                onSchedule={onSchedule}
            />
          ))}
        </CardContent>
      </ScrollArea>
    </Card>
  );
}
