
"use client";

import * as React from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Mic,
  Square,
  ArrowLeft,
  Strikethrough,
  Quote,
  Link as LinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from '@/lib/utils';
import { type View } from './research-hub-view';
import { Separator } from '@/components/ui/separator';

interface NotepadViewProps {
  setView: (view: View) => void;
  editorRef: React.RefObject<HTMLDivElement>;
  handleFormat: (command: string, value?: string) => void;
  handleNotepadMicClick: () => void;
  isNotepadListening: boolean;
  isSttSupported: boolean;
}

export const NotepadView = ({ setView, editorRef, handleFormat, handleNotepadMicClick, isNotepadListening, isSttSupported }: NotepadViewProps) => {
    const preventDefault = (e: React.MouseEvent) => e.preventDefault();
    return (
        <div className="h-full flex flex-col p-4 sm:p-6">
            <div className="flex items-center gap-4 mb-4">
                <Button variant="outline" onClick={() => setView('hub')}><ArrowLeft className="mr-2 h-4 w-4"/> Back to Hub</Button>
                <h2 className="text-2xl font-bold font-headline text-primary">Notepad</h2>
            </div>
            <div className="p-2 border rounded-t-lg flex items-center gap-1 flex-wrap">
                <Button variant="ghost" size="icon" title="Bold" onMouseDown={preventDefault} onClick={() => handleFormat('bold')}><Bold className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" title="Italic" onMouseDown={preventDefault} onClick={() => handleFormat('italic')}><Italic className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" title="Underline" onMouseDown={preventDefault} onClick={() => handleFormat('underline')}><Underline className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" title="Strikethrough" onMouseDown={preventDefault} onClick={() => handleFormat('strikeThrough')}><Strikethrough className="h-4 w-4" /></Button>
                <Separator orientation="vertical" className="h-6 mx-1" />
                <Button variant="ghost" size="icon" title="Unordered List" onMouseDown={preventDefault} onClick={() => handleFormat('insertUnorderedList')}><List className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" title="Ordered List" onMouseDown={preventDefault} onClick={() => handleFormat('insertOrderedList')}><ListOrdered className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" title="Blockquote" onMouseDown={preventDefault} onClick={() => handleFormat('formatBlock', 'blockquote')}><Quote className="h-4 w-4" /></Button>
                <Separator orientation="vertical" className="h-6 mx-1" />
                <Button variant="ghost" size="icon" title="Insert Link" onMouseDown={preventDefault} onClick={() => { const url = prompt('Enter a URL:'); if (url) handleFormat('createLink', url); }}><LinkIcon className="h-4 w-4" /></Button>
                <Separator orientation="vertical" className="h-6 mx-1" />
                <Button variant="ghost" size="icon" title="Dictate Notes" onMouseDown={preventDefault} onClick={handleNotepadMicClick} disabled={!isSttSupported} className={cn(isNotepadListening && "text-destructive")}>
                    {isNotepadListening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
            </div>
            <ScrollArea className="flex-1 border-x border-b rounded-b-lg">
              <div
                ref={editorRef}
                contentEditable
                className="prose dark:prose-invert max-w-none p-6 focus:outline-none h-full"
                placeholder="Start writing your notes here..."
              />
            </ScrollArea>
        </div>
    );
};
