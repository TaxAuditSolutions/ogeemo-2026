
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Briefcase, ListTodo, Calendar, Lightbulb, Clock } from "lucide-react";
import Link from "next/link";

interface TaskCreationInfoDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const InfoItem = ({ icon: Icon, title, children }: { icon: React.ElementType, title: string, children: React.ReactNode }) => (
    <div className="flex items-start gap-4">
        <div className="p-2 bg-primary/10 rounded-lg mt-1">
            <Icon className="h-5 w-5 text-primary"/>
        </div>
        <div>
            <h4 className="font-semibold">{title}</h4>
            <p className="text-sm text-muted-foreground">{children}</p>
        </div>
    </div>
);

export function TaskCreationInfoDialog({ isOpen, onOpenChange }: TaskCreationInfoDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>How Tasks and Events Are Created</DialogTitle>
          <DialogDescription>
            This list shows all tasks and scheduled events from across your workspace. Here’s how they are created:
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <InfoItem icon={Clock} title="Task & Event Manager">
                This is the primary tool for creating detailed tasks and calendar events. You can access it from the main menu or by clicking a time slot on the calendar. It allows you to assign clients, projects, billable rates, and more.
            </InfoItem>
            <InfoItem icon={Briefcase} title="Project Task Boards">
                When viewing a specific project's task board, clicking "Add Task" creates a new task that is automatically linked to that project.
            </InfoItem>
             <InfoItem icon={ListTodo} title="To-Do List">
                Items from your simple <Link href="/to-do" className="text-primary hover:underline">To-Do List</Link> can be converted into full-fledged tasks by selecting "Schedule to calendar" from their menu. This sends them to the Task & Event Manager.
            </InfoItem>
            <InfoItem icon={Lightbulb} title="Idea Board">
                Similarly, ideas from your <Link href="/idea-board" className="text-primary hover:underline">Idea Board</Link> can be scheduled to your calendar, which also uses the Task & Event Manager to create a formal task.
            </InfoItem>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
