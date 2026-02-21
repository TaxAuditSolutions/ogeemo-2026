
'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ImagePlaceholder } from '@/components/ui/image-placeholder';
import { ArrowRight, Sparkles } from 'lucide-react';

/**
 * @fileOverview The primary welcome landing page for authenticated users.
 * This serves as the initial portal into the Ogeemo ecosystem.
 */
export default function WelcomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-4 bg-muted/10">
      <div className="w-full max-w-4xl space-y-12 animate-in fade-in zoom-in-95 duration-700">
        <header className="text-center space-y-4">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold font-headline text-primary tracking-tight">
            Welcome to Ogeemo
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Your business digital nervous system is ready. <br className="hidden md:block" /> Let's begin the orchestration.
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
              Start <ArrowRight className="ml-2 h-6 w-6" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
