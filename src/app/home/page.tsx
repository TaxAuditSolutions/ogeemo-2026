
'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SiteHeader } from '@/components/landing/header';
import { SiteFooter } from '@/components/landing/footer';
import { ImagePlaceholder } from '@/components/ui/image-placeholder';
import { ChevronDown } from 'lucide-react';

export default function HomePage() {
  const handleScroll = () => {
    const nextSection = document.getElementById('visionaries-section');
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  return (
    <>
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-1 container px-4 space-y-16">
          {/* Hero Section */}
          <section className="text-center flex flex-col items-center pt-16">
            <div className="space-y-6 max-w-4xl">
              <ImagePlaceholder data-ai-hint="homepage hero" className="w-full h-96 mb-8" />
              <h1 className="text-4xl md:text-6xl font-bold font-headline text-primary">
                Ogeemo: Your Business Command Center
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                Tired of juggling multiple apps for accounting, projects, and CRM? Ogeemo is the all-in-one platform that unifies every part of your business, so you can stop managing software and start building your empire.
              </p>
              <div className="mt-8 flex flex-col items-center gap-4">
                <div className="flex justify-center gap-4">
                    <Button asChild size="lg">
                    <Link href="/login">Login</Link>
                    </Button>
                    <Button asChild size="lg" variant="outline">
                    <Link href="/explore">Explore Ogeemo</Link>
                    </Button>
                </div>
                <Button variant="link" onClick={handleScroll} className="text-muted-foreground">
                    Learn More
                    <ChevronDown className="ml-2 h-5 w-5 animate-bounce" />
                </Button>
              </div>
            </div>
          </section>

          {/* Visionaries Section */}
          <section id="visionaries-section" className="py-16">
             <div className="text-center p-8 border-2 border-primary/20 rounded-lg max-w-4xl mx-auto">
                  <h2 className="text-3xl md:text-4xl font-bold font-headline text-primary">Built for Visionaries, by Visionaries</h2>
                  <p className="mt-4 text-lg text-muted-foreground">
                      Ogeemo is not a casual project; it's the result of immense dedication and a commitment to pushing boundaries. This is a platform built for those who see the bigger picture—the entrepreneurs ready to take their business to the next level.
                  </p>
              </div>
          </section>

          {/* Differentiators Section */}
          <section className="bg-muted rounded-lg p-8 py-16">
              <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold font-headline text-primary">What Makes Ogeemo Different?</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-primary">Deep Integration, Not Just Login</CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground">
                      <p>We go beyond a simple "Sign in with Google." Ogeemo is built from the ground up to deeply integrate with Google Workspace. Your Calendar, Drive, and Contacts are seamlessly woven into your business operations, providing a single source of truth.</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-primary">The AI Core That Understands</CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground">
                      <p>Our intelligent AI acts as a central nervous system, connecting the dots across all modules. It understands the context of your work, linking a client's email to a project task, which then automatically informs an invoice.</p>
                    </CardContent>
                  </Card>
                   <Card>
                    <CardHeader>
                      <CardTitle className="text-primary">Complexity So You Can Have Simplicity</CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground">
                      <p>We took on the challenge of solving all your business problems in one place. We've built the complex architecture so you can enjoy a simple, unified, and powerful experience that simplifies your life, not complicates it.</p>
                    </CardContent>
                  </Card>
              </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
