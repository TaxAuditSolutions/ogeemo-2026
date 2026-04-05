'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ImagePlaceholder } from '@/components/ui/image-placeholder';
import { ArrowRight, Sparkles, HeartHandshake, ShieldCheck, User, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * @fileOverview The primary welcome landing page for authenticated members.
 * Features the "Welcome Home" modal node for new Ogeemo Circle members.
 */
export default function WelcomePage() {
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  useEffect(() => {
    // Show modal only if it hasn't been dismissed in this session
    const hasSeenWelcome = sessionStorage.getItem('ogeemo-welcome-seen');
    if (!hasSeenWelcome) {
        setShowWelcomeModal(true);
    }
  }, []);

  const handleDismissWelcome = () => {
    sessionStorage.setItem('ogeemo-welcome-seen', 'true');
    setShowWelcomeModal(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-4 bg-muted/10">
      <div className="w-full max-w-4xl space-y-12 animate-in fade-in zoom-in-95 duration-700">
        <header className="text-center space-y-4">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold font-headline text-primary tracking-tight">
            Welcome to the Circle.
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Your high-fidelity operational engine is ready. <br className="hidden md:block" /> Let's begin the orchestration.
          </p>
        </header>

        {/* Welcome Graphic Container */}
        <div className="relative aspect-[21/9] w-full rounded-3xl overflow-hidden shadow-2xl border-8 border-white bg-white">
          <ImagePlaceholder id="welcome-graphic" className="object-cover" />
        </div>

        <div className="flex justify-center pt-4">
          <Button 
            asChild 
            size="lg" 
            className="h-16 px-12 text-xl font-bold rounded-full shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 active:translate-y-0"
          >
            <Link href="/action-manager">
              Enter Command Centre <ArrowRight className="ml-2 h-6 w-6" />
            </Link>
          </Button>
        </div>
      </div>

      <Dialog open={showWelcomeModal} onOpenChange={setShowWelcomeModal}>
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden border-none shadow-2xl text-black">
            <div className="bg-primary p-8 text-primary-foreground relative">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-4 right-4 text-primary-foreground/50 hover:text-primary-foreground hover:bg-white/10"
                    onClick={handleDismissWelcome}
                >
                    <X className="h-5 w-5" />
                </Button>
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="bg-white/20 p-4 rounded-full">
                        <HeartHandshake className="h-12 w-12" />
                    </div>
                    <DialogTitle className="text-3xl font-headline uppercase tracking-tighter">Welcome Home.</DialogTitle>
                    <DialogDescription className="text-lg opacity-90 leading-relaxed text-primary-foreground">
                        You are no longer app-juggling in isolation. You are a member of the Ogeemo Circle.
                    </DialogDescription>
                </div>
            </div>
            <div className="p-8 space-y-8 bg-white">
                <div className="grid gap-6">
                    <div className="flex gap-4 items-start">
                        <div className="bg-primary/10 p-2 rounded-lg shrink-0">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h4 className="font-bold text-sm uppercase tracking-widest text-slate-900">Direct Mentor Access</h4>
                            <p className="text-sm text-muted-foreground">As an Apprentice, you have direct line access to <strong>Dan White</strong> and our team of Certified Mentors for operational guidance and mediation.</p>
                        </div>
                    </div>
                    <div className="flex gap-4 items-start">
                        <div className="bg-primary/10 p-2 rounded-lg shrink-0">
                            <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h4 className="font-bold text-sm uppercase tracking-widest text-slate-900">The Mentor's Seal</h4>
                            <p className="text-sm text-muted-foreground">Your progression path is active. Master the BKS Ledger and our core protocols to earn your Seal and join the guidance team.</p>
                        </div>
                    </div>
                </div>
                
                <div className="bg-muted/30 p-4 rounded-xl border border-dashed text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Status: Apprentice Node Active</p>
                </div>

                <Button onClick={handleDismissWelcome} size="lg" className="w-full h-14 text-lg font-bold shadow-lg">
                    Begin Orchestration
                </Button>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
