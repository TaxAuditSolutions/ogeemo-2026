'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Mic, Bot, Send, BrainCircuit, HelpCircle, Info, LoaderCircle, User, Square, X, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/context/auth-context';
import { useSpeechToText } from '@/hooks/use-speech-to-text';
import { cn } from '@/lib/utils';
import { ogeemoAgent } from '@/ai/flows/ogeemo-chat';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ogeemo';
}

export default function OgeemoAiPage() {
  const [command, setCommand] = useState('');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatBaseTextRef = useRef("");

  const { isListening, startListening, stopListening, isSupported, status: speechStatus } = useSpeechToText({
    onTranscript: (transcript) => {
      const newText = chatBaseTextRef.current ? `${chatBaseTextRef.current} ${transcript}` : transcript;
      setCommand(newText);
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleClear = () => {
      setMessages([]);
      toast({ title: "Session Cleared" });
  };

  const submitToAgent = async (text: string) => {
    if (!text.trim() || isLoading || !user) return;

    if (isListening) stopListening();

    const userMsg: Message = { id: Date.now().toString(), text: text.trim(), sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
        const history = messages.map(m => ({
            role: m.sender === 'user' ? 'user' as const : 'model' as const,
            content: [{ text: m.text }]
        }));

        // Call the server action directly with a clientUserId fallback
        const result = await ogeemoAgent({
            message: text.trim(),
            history,
            clientUserId: user.uid
        });

        const ogeemoMsg: Message = { id: (Date.now() + 1).toString(), text: result.reply, sender: 'ogeemo' };
        setMessages(prev => [...prev, ogeemoMsg]);
    } catch (error: any) {
        console.error("[Ogeemo AI UI] Agent Error:", error);
        toast({ variant: 'destructive', title: "Agent Error", description: error.message });
    } finally {
        setIsLoading(false);
    }
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitToAgent(command);
    setCommand('');
  };

  const handleQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitToAgent(question);
    setQuestion('');
  };

  const handleMicClick = () => {
      if (isListening) stopListening();
      else {
          chatBaseTextRef.current = command || question;
          startListening();
      }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 flex flex-col h-full items-center">
      <header className="relative text-center w-full max-w-5xl">
        <div className="absolute left-0 top-1/2 -translate-y-1/2">
            <Button asChild variant="outline" size="sm">
                <Link href="/action-manager">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Link>
            </Button>
        </div>
        <h1 className="text-3xl font-bold font-headline text-primary">
          Ogeemo AI Assistant
        </h1>
        <p className="text-muted-foreground">
          Your proactive business partner. Give a command or ask a question.
        </p>
        <div className="absolute right-0 top-1/2 -translate-y-1/2">
            <Button variant="ghost" size="sm" onClick={handleClear}>
                <RefreshCw className="mr-2 h-4 w-4" /> Clear Chat
            </Button>
        </div>
      </header>

      <Alert className="max-w-4xl mx-auto bg-primary/5 border-primary/20">
        <Info className="h-4 w-4 text-primary" />
        <AlertTitle>Developer Preview</AlertTitle>
        <AlertDescription>
          Ogeemo AI can now schedule tasks, search your contacts, and answer questions. We are continuously adding more operational capabilities.
        </AlertDescription>
      </Alert>

      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        <div className="lg:col-span-4 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                  <BrainCircuit className="h-5 w-5 text-primary" />
                  Give a Command
              </CardTitle>
              <CardDescription className="text-xs">
                "Schedule a meeting with Dan tomorrow at 3pm."
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCommandSubmit} className="flex gap-2">
                  <Input
                    placeholder="Tell Ogeemo to do something..."
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    disabled={isLoading}
                  />
                  <Button type="submit" size="icon" disabled={!command.trim() || isLoading}>
                    <Send className="h-4 w-4" />
                  </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  Ask a Question
              </CardTitle>
              <CardDescription className="text-xs">
                "What is the BKS accounting method?"
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleQuestionSubmit} className="flex gap-2">
                  <Input
                    placeholder="Ask Ogeemo for info..."
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    disabled={isLoading}
                  />
                  <Button type="submit" size="icon" variant="secondary" disabled={!question.trim() || isLoading}>
                    <Send className="h-4 w-4" />
                  </Button>
              </form>
            </CardContent>
          </Card>
          
          <Button 
            variant={isListening ? "destructive" : "outline"} 
            className="w-full h-12 gap-2"
            onClick={handleMicClick}
            disabled={!isSupported}
          >
            {isListening ? <Square className="h-4 w-4 animate-pulse" /> : <Mic className="h-4 w-4" />}
            {isListening ? "Stop Dictating" : "Use Voice Input"}
          </Button>
        </div>

        <Card className="lg:col-span-8 flex flex-col min-h-0">
            <CardHeader className="border-b bg-muted/30 py-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Bot className="h-4 w-4 text-primary" />
                    Assistant Activity
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-0">
                <ScrollArea className="h-full" ref={scrollRef}>
                    <div className="p-4 space-y-4">
                        {messages.length === 0 && !isLoading && (
                            <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground opacity-50">
                                <Bot className="h-12 w-12 mb-2" />
                                <p className="text-sm">Ready for your commands and questions.</p>
                            </div>
                        )}
                        {messages.map((m) => (
                            <div key={m.id} className={cn("flex gap-3", m.sender === 'user' ? "flex-row-reverse" : "flex-row")}>
                                <Avatar className="h-8 w-8 shrink-0">
                                    <AvatarFallback className={cn(m.sender === 'user' ? "bg-primary text-primary-foreground" : "bg-muted")}>
                                        {m.sender === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                    </AvatarFallback>
                                </Avatar>
                                <div className={cn(
                                    "rounded-lg px-4 py-2 text-sm max-w-[85%]",
                                    m.sender === 'user' ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted border"
                                )}>
                                    <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: m.text.replace(/\n/g, '<br />') }} />
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-3 items-start animate-pulse">
                                <Avatar className="h-8 w-8 shrink-0">
                                    <AvatarFallback className="bg-muted"><Bot className="h-4 w-4" /></AvatarFallback>
                                </Avatar>
                                <div className="bg-muted border rounded-lg px-4 py-3 h-10 w-24 flex items-center justify-center">
                                    <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
