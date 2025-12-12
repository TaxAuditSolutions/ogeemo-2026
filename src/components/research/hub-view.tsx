
"use client";

import * as React from 'react';
import { Bot, Pencil, UploadCloud, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type View } from './research-hub-view';

interface HubViewProps {
  setView: (view: View) => void;
}

export const HubView = ({ setView }: HubViewProps) => {
  const [infoContent, setInfoContent] = React.useState<{ title: string; details: string; } | null>(null);

  const features = [
    {
      view: 'sources' as View,
      icon: UploadCloud,
      title: 'Manage Sources',
      description: "Upload documents, add web links, and manage the knowledge base for your research.",
      cta: 'Go to Sources',
      details: "Think of the Sources manager as the brainpower behind your Ogeemo Assistant. It's where you provide the specific documents, articles, and data that you want the assistant to use for its research. By grounding the assistant in your specific information, it can provide highly relevant and accurate answers instead of generic ones."
    },
    {
      view: 'notepad' as View,
      icon: Pencil,
      title: 'My Notepad',
      description: "A space to draft notes, synthesize information, and pin key insights from your research.",
      cta: 'Open Notepad',
      details: "The Notepad is your central workspace for thinking and writing. You can draft notes, organize your thoughts, and synthesize information from your research. It's also where you can 'pin' key insights and summaries directly from the Ogeemo Assistant, creating a persistent record of your most important findings."
    },
    {
      view: 'assistant' as View,
      icon: Bot,
      title: 'Ogeemo Assistant',
      description: "Chat with your assistant to get summaries, ask questions, and generate ideas based on your sources.",
      cta: 'Start Chat',
      details: "The Ogeemo Assistant is a powerful chat interface that helps you interact with your research sources. You can ask it to summarize documents, find key points, answer specific questions about the content, and even brainstorm new ideas. The assistant's knowledge is based on the files and links you provide in the Sources manager, making it an expert on your specific topic."
    },
  ];

  const handleInfoClick = (e: React.MouseEvent, feature: (typeof features)[0]) => {
      e.stopPropagation(); // Prevent card's onClick from firing
      setInfoContent({ title: feature.title, details: feature.details });
  };

  return (
     <>
        <div className="p-4 sm:p-6 space-y-6">
            <header className="text-center">
                <h1 className="text-3xl font-bold font-headline text-primary">
                Research Hub
                </h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                Your intelligent workspace for synthesizing information. Select a tool to get started.
                </p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {features.map((feature) => (
                <Card key={feature.view} className="flex flex-col hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setView(feature.view)}>
                    <CardHeader>
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/10 rounded-lg">
                                <feature.icon className="h-6 w-6 text-primary" />
                                </div>
                                <CardTitle>{feature.title}</CardTitle>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={(e) => handleInfoClick(e, feature)}>
                                <Info className="h-4 w-4" />
                                <span className="sr-only">More info about {feature.title}</span>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <CardDescription>{feature.description}</CardDescription>
                    </CardContent>
                    <CardFooter>
                        <div className="text-sm font-semibold text-primary">{feature.cta} &rarr;</div>
                    </CardFooter>
                </Card>
                ))}
            </div>
        </div>

        <Dialog open={!!infoContent} onOpenChange={(open) => !open && setInfoContent(null)}>
            <DialogContent>
            <DialogHeader>
                <DialogTitle>{infoContent?.title}</DialogTitle>
            </DialogHeader>
            <div className="py-4 prose prose-sm dark:prose-invert max-w-none">
                <p>{infoContent?.details}</p>
            </div>
            <DialogFooter>
                <Button onClick={() => setInfoContent(null)}>Close</Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>
     </>
  )
};
