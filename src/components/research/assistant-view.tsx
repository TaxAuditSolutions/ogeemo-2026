
"use client";

import * as React from 'react';
import {
  Bot,
  User,
  Send,
  LoaderCircle,
  Pin,
  Mic,
  Square,
  ArrowLeft,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from '@/lib/utils';
import { type ChatMessage } from '@/data/research';
import { type View } from './research-hub-view';

interface AssistantViewProps {
  setView: (view: View) => void;
  chatMessages: ChatMessage[];
  handleAddToNotepad: (content: React.ReactNode) => void;
  isLoading: boolean;
  userInput: string;
  setUserInput: (input: string) => void;
  handleSendMessage: (e: React.FormEvent) => void;
  handleAssistantMicClick: () => void;
  isAssistantListening: boolean;
  isSttSupported: boolean;
}

export const AssistantView = ({ setView, chatMessages, handleAddToNotepad, isLoading, userInput, setUserInput, handleSendMessage, handleAssistantMicClick, isAssistantListening, isSttSupported }: AssistantViewProps) => (
    <div className="h-full flex flex-col p-4 sm:p-6">
        <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" onClick={() => setView('hub')}><ArrowLeft className="mr-2 h-4 w-4"/> Back to Hub</Button>
            <h2 className="text-2xl font-bold font-headline text-primary">Ogeemo Assistant</h2>
        </div>
        <Card className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                {chatMessages.map((msg: any, index: number) => (
                    <div key={index} className={cn("flex items-start gap-3", msg.sender === 'user' ? "justify-end" : "justify-start")}>
                        {msg.sender === 'ogeemo' && <Avatar className="h-8 w-8"><AvatarFallback><Bot/></AvatarFallback></Avatar>}
                        <div className={cn(
                            "max-w-md rounded-lg px-4 py-2 text-sm relative group",
                             msg.sender === 'user' ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}>
                            <div className="prose prose-sm dark:prose-invert max-w-none">{msg.text}</div>
                            {msg.sender === 'ogeemo' && (
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="absolute -top-2 -right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleAddToNotepad(msg.text)}
                                >
                                    <Pin className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                        {msg.sender === 'user' && <Avatar className="h-8 w-8"><AvatarFallback><User/></AvatarFallback></Avatar>}
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-start gap-3 justify-start">
                        <Avatar className="h-8 w-8"><AvatarFallback><Bot/></AvatarFallback></Avatar>
                        <div className="bg-muted rounded-lg px-4 py-2 text-sm flex items-center">
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                        </div>
                    </div>
                )}
                </div>
            </ScrollArea>
            <div className="p-4 border-t">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <Input
                  value={userInput}
                  onChange={(e: any) => setUserInput(e.target.value)}
                  placeholder="Ask a follow-up question..."
                  disabled={isLoading}
                />
                <Button type="button" variant="ghost" size="icon" onClick={handleAssistantMicClick} disabled={!isSttSupported || isLoading} className={cn(isAssistantListening && "text-destructive")}>
                  {isAssistantListening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Button type="submit" size="icon" disabled={isLoading || !userInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
        </Card>
    </div>
);
