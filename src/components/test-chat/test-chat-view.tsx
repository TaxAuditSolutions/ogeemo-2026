
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, LoaderCircle, Send, User, Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSpeechToText, type SpeechRecognitionStatus } from "@/hooks/use-speech-to-text";
import { useToast } from "@/hooks/use-toast";

// This is now a client-safe type definition.
interface ClientMessage {
    role: 'user' | 'model';
    content: { text: string }[];
}

type Message = {
  id: string;
  text: string;
  sender: "user" | "bot";
};

export function TestChatView() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const baseTextRef = useRef("");

  const {
    status,
    isListening,
    startListening,
    stopListening,
    isSupported,
  } = useSpeechToText({
    onTranscript: (transcript) => {
      const newText = baseTextRef.current
        ? `${baseTextRef.current} ${transcript}`
        : transcript;
      setInput(newText);
    },
  });

  useEffect(() => {
    if (isSupported === false) {
      toast({
        variant: "destructive",
        title: "Voice Input Not Supported",
        description: "Your browser does not support the Web Speech API.",
      });
    }
  }, [isSupported, toast]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  const submitMessage = useCallback(async () => {
    const currentInput = input.trim();
    if (!currentInput || isLoading) return;

    if (isListening) {
      stopListening();
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: currentInput,
      sender: "user",
    };
    
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
        const history: ClientMessage[] = newMessages.slice(0, -1).map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            content: [{ text: msg.text }]
        }));
        
        // **THE FIX:** Use fetch to call the API endpoint instead of a direct import.
        const response = await fetch('/api/genkit/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: currentInput,
                history: history
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'The API returned an error.');
        }

        const responseData = await response.json();
        const botMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: responseData.reply,
            sender: "bot",
        };
        setMessages((prev) => [...prev, botMessage]);

    } catch (error: any) {
      console.error("Error with Test Chat:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `Sorry, the test chat encountered an error: ${error.message}`,
        sender: "bot",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, isListening, stopListening, messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    submitMessage();
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      baseTextRef.current = input.trim();
      startListening();
    }
  };

  const renderMicIcon = (currentStatus: SpeechRecognitionStatus) => {
    switch (currentStatus) {
      case 'listening':
        return <Square className="h-5 w-5" />;
      case 'activating':
        return <LoaderCircle className="h-5 w-5 animate-spin" />;
      case 'idle':
      default:
        return <Mic className="h-5 w-5" />;
    }
  };

  const getMicButtonTitle = (currentStatus: SpeechRecognitionStatus) => {
     if (isSupported === false) return "Voice input not supported";
     switch (currentStatus) {
        case 'listening':
            return "Stop dictation";
        case 'activating':
            return "Activating...";
        case 'idle':
        default:
            return "Start dictation";
     }
  };

  return (
    <div className="p-4 sm:p-6 flex flex-col items-center h-full">
      <header className="text-center mb-6">
        <h1 className="text-2xl font-bold font-headline text-primary">
          AI Chat Test Page
        </h1>
        <p className="text-muted-foreground">
          Use this page to debug the AI chat functionality in isolation.
        </p>
      </header>
        <Card className="w-full max-w-2xl flex-1 flex flex-col">
          <CardHeader>
            <CardTitle>Test Chat</CardTitle>
            <CardDescription>
              This is a test environment for the chat feature.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <ScrollArea className="h-full pr-4" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex items-start gap-3",
                      message.sender === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.sender === "bot" && (
                      <Avatar className="h-8 w-8">
                        <AvatarFallback><Bot /></AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={cn(
                        "max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-4 py-2 text-sm",
                        message.sender === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {message.text}
                    </div>
                    {message.sender === "user" && (
                      <Avatar className="h-8 w-8">
                        <AvatarFallback><User /></AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-start gap-3 justify-start">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback><Bot /></AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-lg px-4 py-2 text-sm flex items-center">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter>
            <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "flex-shrink-0",
                  isListening && "text-destructive"
                )}
                onClick={handleMicClick}
                disabled={isSupported === false || isLoading || status === 'activating'}
                title={getMicButtonTitle(status)}
              >
                {renderMicIcon(status)}
                <span className="sr-only">Use Voice</span>
              </Button>
              <Input
                placeholder="Enter your message here..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        submitMessage();
                    }
                }}
                disabled={isLoading}
                autoComplete="off"
              />
              <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                <Send className="h-5 w-5" />
                <span className="sr-only">Send Message</span>
              </Button>
            </form>
          </CardFooter>
        </Card>
    </div>
  );
}
