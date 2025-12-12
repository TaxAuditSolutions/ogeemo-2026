
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Mic,
  Square,
  LoaderCircle,
  X,
  Bot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from '@/components/ui/dialog';
import { useSpeechToText } from '@/hooks/use-speech-to-text';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ClientMessage {
    role: 'user' | 'model';
    content: { text: string }[];
}

interface GlobalSearchProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ isOpen, onOpenChange }: GlobalSearchProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const { toast } = useToast();
  const baseTextRef = useRef('');

  const { isListening, startListening, stopListening, isSupported } = useSpeechToText({
    onTranscript: (transcript) => {
      const newText = baseTextRef.current ? `${baseTextRef.current} ${transcript}` : transcript;
      setInput(newText);
    },
  });
  
  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      onOpenChange(true);
      baseTextRef.current = input.trim();
      startListening();
    }
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!isOpen);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [isOpen, onOpenChange]);
  
  useEffect(() => {
    if (!isOpen) {
        setInput('');
        if (isListening) stopListening();
    }
  }, [isOpen, isListening, stopListening]);


  return (
    <>
      <div className="flex w-full items-center gap-2">
        <Button
          variant="outline"
          className="relative h-10 w-full justify-start text-sm text-muted-foreground"
          onClick={() => onOpenChange(true)}
        >
          <Search className="h-4 w-4 mr-2" />
          <span className="truncate">Give a command or ask a question...</span>
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-2 font-mono text-xs font-medium opacity-100 sm:flex">
            <span className="text-lg">⌘</span>K
          </kbd>
        </Button>
      </div>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="w-full h-full max-w-none top-0 left-0 translate-x-0 translate-y-0 rounded-none sm:rounded-none flex flex-col p-0 sm:max-w-md sm:h-auto sm:top-[50%] sm:left-[50%] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg">
            <DialogHeader className="p-4 border-b text-center relative bg-gradient-to-r from-[#3DD5C0] to-[#1E8E86] text-primary-foreground">
              <DialogTitle className="text-2xl font-bold font-headline">
                Ogeemo Command Centre
              </DialogTitle>
              <DialogDescription className="text-primary-foreground/90">
                This feature is currently under development.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center p-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                    <Bot className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Coming Soon!</h3>
                <p className="text-muted-foreground">
                    The AI-powered Command Centre is being fine-tuned and will be available shortly. Thank you for your patience!
                </p>
            </div>
            
            <DialogFooter className="p-4 border-t shrink-0">
                <DialogClose asChild>
                    <Button className="w-full">Close</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
