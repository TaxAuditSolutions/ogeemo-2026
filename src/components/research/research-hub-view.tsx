
"use client";

import * as React from 'react';
import dynamic from 'next/dynamic';
import { renderToStaticMarkup } from 'react-dom/server';

import { useToast } from '@/hooks/use-toast';
import { useSpeechToText } from '@/hooks/use-speech-to-text';
import { mockSources, initialChatMessages, type Source, type ChatMessage } from '@/data/research';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { LoaderCircle, Search } from 'lucide-react';

// Dynamically import the views for code-splitting
const HubView = dynamic(() => import('./hub-view').then(mod => mod.HubView), { ssr: false, loading: () => <div className="flex h-full w-full items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin" /></div> });
const SourcesView = dynamic(() => import('./sources-view').then(mod => mod.SourcesView), { ssr: false, loading: () => <div className="flex h-full w-full items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin" /></div> });
const NotepadView = dynamic(() => import('./notepad-view').then(mod => mod.NotepadView), { ssr: false, loading: () => <div className="flex h-full w-full items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin" /></div> });
const AssistantView = dynamic(() => import('./assistant-view').then(mod => mod.AssistantView), { ssr: false, loading: () => <div className="flex h-full w-full items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin" /></div> });

export type View = 'hub' | 'sources' | 'notepad' | 'assistant';

export function ResearchHubView() {
  const [view, setView] = React.useState<View>('hub');
  const [sources, setSources] = React.useState<Source[]>(mockSources);
  const [selectedSourceId, setSelectedSourceId] = React.useState<string | null>(null);
  const [chatMessages, setChatMessages] = React.useState<ChatMessage[]>(initialChatMessages);
  const [userInput, setUserInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();
  const editorRef = React.useRef<HTMLDivElement>(null);

  const [isSearchDialogOpen, setIsSearchDialogOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isSearching, setIsSearching] = React.useState(false);

  const [notepadContentBeforeSpeech, setNotepadContentBeforeSpeech] = React.useState('');
  const {
    isListening: isNotepadListening,
    startListening: startNotepadListening,
    stopListening: stopNotepadListening,
    isSupported: isSttSupported,
  } = useSpeechToText({
    onTranscript: (transcript) => {
      if (editorRef.current) {
        const newText = notepadContentBeforeSpeech ? `${notepadContentBeforeSpeech} ${transcript}` : transcript;
        editorRef.current.innerHTML = newText;
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    },
  });

  const handleNotepadMicClick = () => {
    if (isNotepadListening) {
      stopNotepadListening();
      if (editorRef.current) {
         editorRef.current.focus();
      }
    }
    else {
      if (editorRef.current) {
        setNotepadContentBeforeSpeech(editorRef.current.innerHTML);
        editorRef.current.focus();
        startNotepadListening();
      }
    }
  };

  const assistantBaseTextRef = React.useRef("");
  const {
    isListening: isAssistantListening,
    startListening: startAssistantListening,
    stopListening: stopAssistantListening,
  } = useSpeechToText({
    onTranscript: (transcript) => {
      const newText = assistantBaseTextRef.current ? `${assistantBaseTextRef.current} ${transcript}` : transcript;
      setUserInput(newText);
    },
  });

  const handleAssistantMicClick = () => {
    if (isAssistantListening) {
      stopAssistantListening();
    }
    else {
      assistantBaseTextRef.current = userInput.trim();
      startAssistantListening();
    }
  };

  const handleFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleSourceSelect = (sourceId: string) => {
    setSelectedSourceId(sourceId);
    const source = sources.find(s => s.id === sourceId);
    if (source) {
      toast({ title: `Selected: ${source.title}`, description: 'You can now ask the assistant questions about this source.' });
      setView('assistant');
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const currentInput = userInput.trim();
    if (!currentInput) return;

    if (isAssistantListening) {
        stopAssistantListening();
    }

    setChatMessages(prev => [...prev, { sender: 'user', text: currentInput }]);
    setIsLoading(true);
    
    const selectedSource = sources.find(s => s.id === selectedSourceId);

    setTimeout(() => {
      let ogeemoResponse: React.ReactNode = "I'm not sure how to answer that. Try selecting a source first.";
      if (selectedSource) {
         if (selectedSource.title.startsWith('Web Search:')) {
            const originalQuery = selectedSource.title.replace('Web Search: "', '').slice(0, -1);
            ogeemoResponse = (
              <div>
                <p>Here are the key findings from the web search for "{originalQuery}":</p>
                <ul className="list-disc pl-5 my-2 space-y-1">
                  <li>Supplier A is noted for its high-quality materials and reliable delivery schedules, particularly for residential projects.</li>
                  <li>Supplier B offers competitive pricing, making it a strong choice for large-scale commercial contracts.</li>
                  <li>Recent industry reports highlight a trend towards sustainable and eco-friendly roofing materials, with Supplier C leading in this area.</li>
                  <li>Customer reviews emphasize the importance of post-sale support, an area where Supplier A also excels.</li>
                </ul>
              </div>
            );
        } else {
             ogeemoResponse = (
                <div>
                    <p>Based on your document "{selectedSource.title}", here are the key points:</p>
                    <ul className="list-disc pl-5 my-2 space-y-1">
                        <li>The document outlines the initial project brief for an internal initiative.</li>
                        <li>Key deliverables include a market analysis, a prototype, and a final presentation.</li>
                        <li>The deadline for the first phase is the end of the current quarter.</li>
                    </ul>
                </div>
            );
        }
      }
      setChatMessages(prev => [...prev, { sender: 'ogeemo', text: ogeemoResponse }]);
      setIsLoading(false);
    }, 1500);

    setUserInput('');
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setTimeout(() => {
      const newSource: Source = {
        id: `src-${Date.now()}`,
        type: 'web' as const,
        title: `Web Search: "${searchQuery}"`,
        url: `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`,
        summary: `A summary of search results for "${searchQuery}".`,
      };
      setSources(prev => [...prev, newSource]);
      setIsSearching(false);
      setIsSearchDialogOpen(false);
      setSearchQuery("");
      toast({
        title: "Source Added",
        description: "The top search result has been added to your sources.",
      });
      handleSourceSelect(newSource.id);
    }, 2000);
  };

  const handleAddToNotepad = (content: React.ReactNode) => {
    if (editorRef.current) {
        let htmlContent = '';
        if (typeof content === 'string') {
            htmlContent = `<p>${content}</p>`;
        } else if (React.isValidElement(content)) {
            htmlContent = renderToStaticMarkup(content);
        }
        
        const separator = editorRef.current.innerHTML.trim() ? '<hr class="my-4">' : '';
        editorRef.current.innerHTML += `${separator}<blockquote>${htmlContent}</blockquote><p><br></p>`;
      
      toast({ title: "Added to Notepad", description: "The content has been pinned to your notes." });
      setView('notepad');
    }
  };

  const renderView = () => {
    switch(view) {
        case 'sources':
            return <SourcesView setView={setView} sources={sources} selectedSourceId={selectedSourceId} handleSourceSelect={handleSourceSelect} onSearchClick={() => setIsSearchDialogOpen(true)} />;
        case 'notepad':
            return <NotepadView setView={setView} editorRef={editorRef} handleFormat={handleFormat} handleNotepadMicClick={handleNotepadMicClick} isNotepadListening={isNotepadListening} isSttSupported={isSttSupported} />;
        case 'assistant':
            return <AssistantView setView={setView} chatMessages={chatMessages} handleAddToNotepad={handleAddToNotepad} isLoading={isLoading} userInput={userInput} setUserInput={setUserInput} handleSendMessage={handleSendMessage} handleAssistantMicClick={handleAssistantMicClick} isAssistantListening={isAssistantListening} isSttSupported={isSttSupported} />;
        case 'hub':
        default:
            return <HubView setView={setView} />;
    }
  }

  return (
    <div className="h-full">
        {renderView()}

        <Dialog open={isSearchDialogOpen} onOpenChange={setIsSearchDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Search the Internet</DialogTitle>
                    <DialogDescription>
                        Enter a query to find relevant articles and information. The top result will be added as a source.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Label htmlFor="search-query">Search Query</Label>
                    <Input
                        id="search-query"
                        placeholder="e.g., Best suppliers of roofing products in North America"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        disabled={isSearching}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                    />
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsSearchDialogOpen(false)} disabled={isSearching}>Cancel</Button>
                    <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
                        {isSearching ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                        {isSearching ? 'Searching...' : 'Search'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
