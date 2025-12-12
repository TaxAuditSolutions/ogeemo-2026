
"use client";

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { type Idea } from '@/types/calendar-types';

interface EditIdeaDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  idea: Idea | null;
  onSave: (updatedIdea: Idea) => void;
}

export default function EditIdeaDialog({ isOpen, onOpenChange, idea, onSave }: EditIdeaDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (idea) {
      setTitle(idea.title);
      setDescription(idea.description || '');
    }
  }, [idea]);

  const handleSave = () => {
    if (!idea) return;
    if (!title.trim()) {
      toast({
        variant: 'destructive',
        title: 'Title is required',
        description: 'Please provide a title for the idea.',
      });
      return;
    }

    onSave({
      ...idea,
      title: title.trim(),
      description: description.trim(),
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Idea</DialogTitle>
          <DialogDescription>
            Flesh out your idea with more details.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="idea-title">Title</Label>
            <Input
              id="idea-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="idea-description">Description / Notes</Label>
            <Textarea
              id="idea-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              placeholder="Add more details about your idea..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
