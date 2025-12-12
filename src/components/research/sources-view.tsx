
"use client";

import * as React from 'react';
import {
  UploadCloud,
  Link as LinkIcon,
  FileText,
  Search,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from '@/lib/utils';
import { type Source } from '@/data/research';
import { type View } from './research-hub-view';

interface SourcesViewProps {
  setView: (view: View) => void;
  sources: Source[];
  selectedSourceId: string | null;
  handleSourceSelect: (id: string) => void;
  onSearchClick: () => void;
}

export const SourcesView = ({ setView, sources, selectedSourceId, handleSourceSelect, onSearchClick }: SourcesViewProps) => (
  <div className="h-full flex flex-col p-4 sm:p-6">
    <div className="flex items-center gap-4 mb-4">
        <Button variant="outline" onClick={() => setView('hub')}><ArrowLeft className="mr-2 h-4 w-4"/> Back to Hub</Button>
        <h2 className="text-2xl font-bold font-headline text-primary">Sources</h2>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
      <Button><UploadCloud className="mr-2 h-4 w-4" /> Upload File</Button>
      <Button><LinkIcon className="mr-2 h-4 w-4" /> Add Web Link</Button>
      <Button onClick={onSearchClick}><Search className="mr-2 h-4 w-4" /> Search Internet</Button>
    </div>
    <ScrollArea className="flex-1 border rounded-lg">
      <div className="p-4 space-y-2">
        {sources.map(source => (
          <div
            key={source.id}
            className={cn(
              "p-3 rounded-lg border cursor-pointer transition-colors",
              selectedSourceId === source.id ? "bg-primary/10 border-primary" : "hover:bg-muted/50"
            )}
            onClick={() => handleSourceSelect(source.id)}
          >
            <div className="flex items-start gap-3">
              {source.type === 'pdf' ? <FileText className="h-5 w-5 mt-0.5 text-primary" /> : <LinkIcon className="h-5 w-5 mt-0.5 text-primary" />}
              <p className="font-semibold text-sm truncate flex-1">{source.title}</p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  </div>
);
