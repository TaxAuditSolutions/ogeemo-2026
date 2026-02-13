'use client';

import React, { useState, useEffect } from 'react';
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
import { type Contact } from '@/data/contacts';
import { Mail, Send } from 'lucide-react';

interface CreateEmailDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  contact: Contact | null;
  onSend: (subject: string, content: string) => void;
}

export function CreateEmailDialog({ isOpen, onOpenChange, contact, onSend }: CreateEmailDialogProps) {
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (isOpen) {
      setSubject("");
      setContent("");
    }
  }, [isOpen]);

  const handleSend = () => {
    if (!subject.trim() && !content.trim()) {
        onOpenChange(false);
        return;
    }
    onSend(subject, content);
    onOpenChange(false);
  };

  if (!contact) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Draft Email for {contact.name}
          </DialogTitle>
          <DialogDescription>
            Compose your message below. Clicking "Prepare Email" will open Gmail with these details pre-filled.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="What is this email about?"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Message Content</Label>
            <Textarea
              id="content"
              placeholder="Type your message here..."
              className="min-h-[200px] resize-none"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSend} disabled={!subject.trim() && !content.trim()}>
            <Send className="mr-2 h-4 w-4" />
            Prepare Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
