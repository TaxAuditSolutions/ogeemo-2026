
'use client';

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Mail, Phone, CreditCard, Bot, ZoomIn, Save } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const COMMUNICATIONS_NOTES_KEY = 'communications-notes';

export default function CommunicationsManagerPage() {
  const futureFeatures = [
    {
      icon: Mail,
      title: "Email Integration",
      description: "Connect with OgeeMail or external providers like Gmail to send, receive, and manage all your business communications in one place.",
    },
    {
      icon: Phone,
      title: "Telephony Services (e.g., Zoom Phone)",
      description: "Initiate calls, manage call logs, and integrate your business phone system directly into your workflow for seamless client interaction.",
    },
    {
      icon: CreditCard,
      title: "Payment Processing (e.g., Stripe)",
      description: "Integrate with payment gateways to send invoices with payment links, track payment statuses, and manage subscriptions automatically.",
    },
    {
      icon: Bot,
      title: "AI-Powered Automation",
      description: "Leverage AI to automate follow-ups, schedule appointments, and respond to common inquiries across all communication channels.",
    },
  ];

  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const saveTimeoutRef = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem(COMMUNICATIONS_NOTES_KEY);
      if (savedNotes) {
        setNotes(savedNotes);
      }
    } catch (error) {
        console.error("Failed to load notes from localStorage", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load saved notes.' });
    }
  }, [toast]);

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNotes = e.target.value;
    setNotes(newNotes);
    setIsSaving(true);

    if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
        try {
            localStorage.setItem(COMMUNICATIONS_NOTES_KEY, newNotes);
        } catch (error) {
             console.error("Failed to save notes to localStorage", error);
             toast({ variant: 'destructive', title: 'Error', description: 'Could not save notes.' });
        } finally {
            setIsSaving(false);
        }
    }, 1000);
  };


  return (
    <div className="p-4 sm:p-6 space-y-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold font-headline text-primary flex items-center justify-center gap-3">
          <MessageSquare className="h-8 w-8" />
          Communications Manager
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto mt-2">
          Your future hub for all client and team interactions. This manager will centralize email, phone, and payment communications.
        </p>
      </header>
      
      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                <CardTitle>Future Vision</CardTitle>
                <CardDescription>
                    The Communications Manager is designed to be the central nervous system for all your business interactions. Below are the key integrations planned for this module.
                </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {futureFeatures.map((feature) => (
                    <div key={feature.title} className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 border">
                        <feature.icon className="h-8 w-8 text-primary shrink-0 mt-1" />
                        <div>
                            <h3 className="font-semibold">{feature.title}</h3>
                            <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                    </div>
                ))}
                </CardContent>
            </Card>
        </div>
        
        <div className="lg:col-span-1">
            <Card>
                <CardHeader>
                    <CardTitle>Development Scratchpad</CardTitle>
                    <CardDescription>Jot down ideas and notes for developing Ogeemo's communication features.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Textarea
                        placeholder="e.g., Research Stripe API for payment links..."
                        value={notes}
                        onChange={handleNotesChange}
                        rows={15}
                    />
                     <div className="h-5 mt-2 text-xs text-muted-foreground flex items-center">
                        {isSaving && (
                            <>
                                <Save className="h-3 w-3 mr-1.5 animate-pulse" />
                                <span>Saving...</span>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
