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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Lightbulb, MousePointerClick, Archive, Briefcase, Calendar } from "lucide-react";

interface IdeaBoardInstructionsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export default function IdeaBoardInstructionsDialog({ isOpen, onOpenChange }: IdeaBoardInstructionsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-primary" />
            About the Idea Board
          </DialogTitle>
          <DialogDescription>
            Your guide to capturing, triaging, and acting on your ideas.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
            <AccordionItem value="item-1">
              <AccordionTrigger>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">The "Yes", "No", "Maybe" Framework</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="prose prose-sm dark:prose-invert max-w-none pl-4">
                  <p>
                    The Idea Board is your "inbox" for thoughts. The goal is to quickly sort them so you can decide what to do next.
                  </p>
                  <ul>
                    <li><strong>Yes:</strong> Ideas you are committed to and will act on soon. These often become projects.</li>
                    <li><strong>No:</strong> Ideas you are deciding not to pursue. It's important to consciously say "no" to things.</li>
                    <li><strong>Maybe:</strong> Ideas that have potential but require more thought or better timing. Review this column periodically.</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>
                <div className="flex items-center gap-3">
                  <MousePointerClick className="h-5 w-5 text-primary"/>
                  <span className="font-semibold">Taking Action</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="prose prose-sm dark:prose-invert max-w-none pl-4">
                  <p>
                    Once you've triaged your ideas, you can act on them directly from the card's menu:
                  </p>
                   <ul>
                    <li><p><strong><Briefcase className="inline-block h-4 w-4 mr-1" /> Create New Project:</strong> Converts the idea into a new project in your Project Manager.</p></li>
                    <li><p><strong><Calendar className="inline-block h-4 w-4 mr-1" /> Schedule Item:</strong> Sends the idea to the Event Time Manager to be scheduled on your calendar.</p></li>
                    <li><p><strong><Archive className="inline-block h-4 w-4 mr-1" /> Archive as Reference:</strong> Saves the idea as a note in a dedicated folder in your File Manager for future reference.</p></li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
        <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
