
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Mic, Bot, Send, BrainCircuit, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CommandCentrePage() {
  const [command, setCommand] = useState('');
  const [question, setQuestion] = useState('');
  const { toast } = useToast();

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Command submitted:', command);
    toast({
      title: "Command Sent (Placeholder)",
      description: `Your command "${command}" would be processed here.`,
    });
    setCommand('');
  };

  const handleQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Question submitted:', question);
    toast({
      title: "Question Asked (Placeholder)",
      description: `Your question "${question}" would be answered here.`,
    });
    setQuestion('');
  };

  const handleMicClick = (inputType: 'command' | 'question') => {
      toast({
          title: "Voice Input",
          description: `Voice-to-text for the ${inputType} field would be activated here.`,
      })
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <header className="relative text-center">
        <div className="absolute left-0 top-1/2 -translate-y-1/2">
            <Button asChild variant="outline">
                <Link href="/action-manager">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Action Manager
                </Link>
            </Button>
        </div>
        <h1 className="text-2xl font-bold font-headline text-primary">
          Ogeemo Command Centre
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Interact with your AI-powered assistant. Give a command or ask a question.
        </p>
      </header>

      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                  <BrainCircuit className="h-6 w-6 text-primary" />
                  Give a Command
              </CardTitle>
              <CardDescription>
                Tell Ogeemo what to do. For example, "Create a new contact named John Smith."
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCommandSubmit}>
                <div className="flex w-full items-center space-x-2">
                  <Input
                    type="text"
                    placeholder="e.g., Open my contacts..."
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => handleMicClick('command')}>
                      <Mic className="h-4 w-4" />
                      <span className="sr-only">Use voice for command</span>
                  </Button>
                  <Button type="submit" size="icon">
                    <Send className="h-4 w-4" />
                    <span className="sr-only">Submit command</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-6 w-6 text-primary" />
                  Ask a Question
              </CardTitle>
              <CardDescription>
                Ask Ogeemo for information. For example, "What is BKS?"
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleQuestionSubmit}>
                <div className="flex w-full items-center space-x-2">
                  <Input
                    type="text"
                    placeholder="e.g., What are my overdue tasks?"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => handleMicClick('question')}>
                      <Mic className="h-4 w-4" />
                      <span className="sr-only">Use voice for question</span>
                  </Button>
                  <Button type="submit" size="icon">
                    <Send className="h-4 w-4" />
                    <span className="sr-only">Submit question</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
