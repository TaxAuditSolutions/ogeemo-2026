

"use client";

import React from 'react';
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

interface TaskColumnProps {
  status: TaskStatus;
  tasks: TaskEvent[];
  onAddTask: () => void;
  onMoveTask: (item: TaskEvent | ProjectStep, newStatus: TaskStatus, newPosition: number) => void;
  onTaskDelete: (taskId: string) => void;
  onToggleComplete: (taskId: string) => void;
  onEdit: (task: TaskEvent) => void;
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
  onMoveTask,
  onTaskDelete,
  onToggleComplete,
  onEdit,
  selectedTaskIds,
  onToggleSelect,
  onToggleSelectAll,
}: TaskColumnProps) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ['task', StepItemTypes.STEP],
    drop: (item: TaskEvent | ProjectStep) => {
      onMoveTask(item, status, tasks.length); // Drop at the end of the list
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));
  
  const moveCard = (dragId: string, hoverId: string) => {
    const dragTask = tasks.find(t => t.id === dragId);
    const hoverTask = tasks.find(t => t.id === hoverId);
    if (dragTask && hoverTask) {
        onMoveTask(dragTask, status, hoverTask.position);
    }
  };
  
  const areAllInColumnSelected = tasks.length > 0 && tasks.every(t => selectedTaskIds.includes(t.id));

  return (
    <Card ref={drop} className={cn("flex flex-col", isOver && canDrop && "bg-primary/10 ring-2 ring-primary")}>
      <CardHeader className="flex flex-row items-center justify-between p-4">
        <div className="flex items-center gap-2">
            <Checkbox
              checked={areAllInColumnSelected}
              onCheckedChange={() => onToggleSelectAll(status)}
              aria-label={`Select all tasks in ${columnTitles[status]}`}
            />
            <CardTitle className="text-lg">{columnTitles[status]} <span className="text-sm font-normal text-muted-foreground">({tasks.length})</span></CardTitle>
        </div>
        {status === 'todo' && (
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onAddTask}>
              <Plus className="h-4 w-4" />
            </Button>
        )}
      </CardHeader>
      <ScrollArea className="flex-1">
        <CardContent className="p-4 pt-0 space-y-3">
          {tasks.map((task) => (
            <TaskCard 
                key={task.id} 
                task={task} 
                onMoveCard={moveCard}
                onEdit={onEdit}
                onTaskDelete={onTaskDelete}
                onToggleComplete={onToggleComplete}
                isSelected={selectedTaskIds.includes(task.id)}
                onToggleSelect={onToggleSelect}
            />
          ))}
        </CardContent>
      </ScrollArea>
    </Card>
  );
}

    