
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Bot, LoaderCircle, Send, User, Mic, Square, X, RefreshCw, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSpeechToText, type SpeechRecognitionStatus } from "@/hooks/use-speech-to-text";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";

type Message = {
  id: string;
  text: string;
  sender: "user" | "ogeemo";
};

interface ClientMessage {
    role: 'user' | 'model';
    content: { text: string }[];
}

interface OgeemoChatDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function OgeemoChatDialog({ isOpen, onOpenChange }: OgeemoChatDialogProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [isChatLoading, setIsChatLoading] = useState(false);
    const chatScrollAreaRef = useRef<HTMLDivElement>(null);
    const chatBaseTextRef = useRef("");
    const { toast } = useToast();
    const { user } = useAuth();

    const {
        status: chatStatus,
        isListening: isChatListening,
        startListening,
        stopListening,
        isSupported,
    } = useSpeechToText({
        onTranscript: (transcript) => {
            const newText = chatBaseTextRef.current
                ? `${chatBaseTextRef.current} ${transcript}`
                : transcript;
            setChatInput(newText);
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
        if (chatScrollAreaRef.current) {
        chatScrollAreaRef.current.scrollTo({
            top: chatScrollAreaRef.current.scrollHeight,
            behavior: "smooth",
        });
        }
    }, [messages]);
    
    const handleNewChat = () => {
        setMessages([]);
        toast({
            title: "New Chat Started",
            description: "Your previous conversation has been cleared.",
        });
    };

    const submitChatMessage = useCallback(async () => {
        const currentInput = chatInput.trim();
        if (currentInput === "/Clear") {
            handleNewChat();
            setChatInput("");
            return;
        }
        if (!currentInput || isChatLoading) return;

        if (!user) {
            toast({ variant: 'destructive', title: 'Not Logged In', description: 'You must be logged in to use the assistant.' });
            return;
        }

        if (isChatListening) {
            stopListening();
        }

        const userMessage: Message = {
            id: Date.now().toString(),
            text: currentInput,
            sender: "user",
        };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setChatInput("");
        setIsChatLoading(true);

        try {
            const history: ClientMessage[] = newMessages.slice(0, -1).map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'model',
                content: [{ text: msg.text }]
            }));
            
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
            const ogeemoMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: responseData.reply,
                sender: "ogeemo",
            };
            setMessages((prev) => [...prev, ogeemoMessage]);
        } catch (error: any) {
            console.error("Error with Ogeemo:", error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: `Sorry, I encountered an error: ${error.message}`,
                sender: "ogeemo",
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsChatLoading(false);
        }
    }, [chatInput, isChatLoading, isChatListening, stopListening, user, toast, messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        submitChatMessage();
    };

    const handleChatMicClick = () => {
        if (isChatListening) {
            stopListening();
        } else {
            chatBaseTextRef.current = chatInput.trim();
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
    
    const handleOpenChange = (open: boolean) => {
        if (!open && isChatListening) {
            stopListening();
        }
        onOpenChange(open);
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                <DialogContent className="w-full h-full max-w-none top-0 left-0 translate-x-0 translate-y-0 rounded-none sm:rounded-none flex flex-col p-0">
                    <DialogHeader className="p-6 pb-4 border-b text-center relative">
                        <DialogTitle className="text-2xl font-bold font-headline text-primary">Chat with Ogeemo</DialogTitle>
                        <DialogDescription>
                            Ask me anything or tell me what you would like to do.
                        </DialogDescription>
                         <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={handleNewChat} title="Start New Chat">
                                <RefreshCw className="h-5 w-5" />
                                <span className="sr-only">New Chat</span>
                            </Button>
                        </div>
                    </DialogHeader>
                    <div className="flex-1 p-6 overflow-hidden">
                        <ScrollArea className="h-full pr-4" ref={chatScrollAreaRef}>
                        <div className="space-y-4">
                            {messages.length === 0 && (
                                <div className="flex items-start gap-3 justify-start">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback><Bot /></AvatarFallback>
                                    </Avatar>
                                    <div className="max-w-xs md:max-w-sm rounded-lg px-4 py-2 text-sm bg-muted">
                                        <p className="font-semibold">Welcome to Ogeemo Assistant</p>
                                        <p>You can start by asking a question or giving a command in the input field below.</p>
                                    </div>
                                </div>
                            )}
                            {messages.map((message) => (
                            <div
                                key={message.id}
                                className={cn(
                                "flex items-start gap-3",
                                message.sender === "user" ? "justify-end" : "justify-start"
                                )}
                            >
                                {message.sender === "ogeemo" && (
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback>
                                    <Bot />
                                    </AvatarFallback>
                                </Avatar>
                                )}
                                <div
                                className={cn(
                                    "max-w-xs md:max-w-sm rounded-lg px-4 py-2 text-sm",
                                    message.sender === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                )}
                                >
                                {message.text}
                                </div>
                                {message.sender === "user" && (
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback>
                                    <User />
                                    </AvatarFallback>
                                </Avatar>
                                )}
                            </div>
                            ))}
                            {isChatLoading && (
                            <div className="flex items-start gap-3 justify-start">
                                <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                    <Bot />
                                </AvatarFallback>
                                </Avatar>
                                <div className="bg-muted rounded-lg px-4 py-2 text-sm flex items-center">
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                                </div>
                            </div>
                            )}
                        </div>
                        </ScrollArea>
                    </div>
                    <DialogFooter className="p-6 pt-4 border-t shrink-0">
                        <form
                        onSubmit={handleSendMessage}
                        className="flex w-full items-center space-x-2"
                        >
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={cn(
                            "flex-shrink-0",
                            isChatListening && "text-destructive"
                            )}
                            onClick={handleChatMicClick}
                            disabled={isSupported === false || isChatLoading || chatStatus === 'activating'}
                            title={getMicButtonTitle(chatStatus)}
                        >
                            {renderMicIcon(chatStatus)}
                            <span className="sr-only">Use Voice</span>
                        </Button>
                        <Input
                            placeholder="Enter your message here..."
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    submitChatMessage();
                                }
                            }}
                            disabled={isChatLoading}
                            autoComplete="off"
                        />
                        <Button
                            type="submit"
                            size="icon"
                            disabled={isChatLoading || !chatInput.trim()}
                        >
                            <Send className="h-5 w-5" />
                            <span className="sr-only">Send Message</span>
                        </Button>
                        </form>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
