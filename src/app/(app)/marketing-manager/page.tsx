
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Megaphone, Users, Mail, MessageSquare, Target, CheckCircle, BarChart, Rocket } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

const PlanSection = ({
  phase,
  title,
  objective,
  icon: Icon,
  children,
}: {
  phase: string;
  title: string;
  objective: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) => (
  <Card>
    <CardHeader>
      <div className="flex items-start gap-4">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <CardTitle className="flex items-center gap-3">
            {title} <Badge>{phase}</Badge>
          </CardTitle>
          <CardDescription className="mt-1">{objective}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <Accordion type="single" collapsible className="w-full">
        {children}
      </Accordion>
    </CardContent>
  </Card>
);

const PlanDetail = ({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) => (
  <AccordionItem value={title}>
    <AccordionTrigger>
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <span className="font-semibold">{title}</span>
      </div>
    </AccordionTrigger>
    <AccordionContent>
      <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
        {children}
      </div>
    </AccordionContent>
  </AccordionItem>
);

export default function MarketingManagerPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold font-headline text-primary flex items-center justify-center gap-3">
          <Megaphone className="h-8 w-8" />
          Marketing Manager
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto mt-2">
          A strategic marketing plan for launching Ogeemo to micro and small businesses, starting with a targeted beta test.
        </p>
      </header>

      <div className="max-w-4xl mx-auto space-y-6">
        <PlanSection
          phase="Phase 1: Pre-Beta"
          title="Build & Prepare"
          objective="Generate initial interest and build a waitlist of qualified beta testers."
          icon={Rocket}
        >
          <PlanDetail title="Target Audience" icon={Target}>
            <ul>
              <li><strong>Primary:</strong> Freelancers, solopreneurs, and tech-savvy consultants frustrated with juggling multiple tools (e.g., project management, CRM, invoicing).</li>
              <li><strong>Secondary:</strong> Small businesses (1-5 employees) looking for an affordable, unified platform to streamline operations.</li>
            </ul>
          </PlanDetail>
          <PlanDetail title="Key Messaging" icon={MessageSquare}>
            <ul>
              <li><strong>Tagline:</strong> Ogeemo: Your AI-Powered Business Command Center.</li>
              <li><strong>Value Props:</strong> "Stop juggling apps, start running your business.", "The all-in-one platform that thinks with you.", "From to-do to done, all in one place."</li>
            </ul>
          </PlanDetail>
          <PlanDetail title="Channels & Actions" icon={CheckCircle}>
            <ul>
              <li><strong>Landing Page:</strong> Create a simple, compelling landing page showcasing the core value proposition with a clear call-to-action to join the beta waitlist.</li>
              <li><strong>Social Media (LinkedIn):</strong> Begin posting teasers, development updates, and polls asking about small business pain points.</li>
              <li><strong>Founder's Network:</strong> Leverage personal and professional networks for the first wave of sign-ups.</li>
            </ul>
          </PlanDetail>
        </PlanSection>

        <PlanSection
          phase="Phase 2: Active Beta"
          title="Engage & Refine"
          objective="Onboard beta users, gather intensive feedback, and identify power users."
          icon={Users}
        >
          <PlanDetail title="Onboarding" icon={CheckCircle}>
            <ul>
              <li><strong>Phased Invites:</strong> Send invites in small batches (10-20 users at a time) from the waitlist to manage support and feedback effectively.</li>
              <li><strong>Personal Welcome:</strong> Send a personalized welcome email to each beta user, explaining the process and how to provide feedback.</li>
            </ul>
          </PlanDetail>
          <PlanDetail title="Feedback Loop" icon={MessageSquare}>
            <ul>
              <li><strong>In-App Feedback Tool:</strong> Implement a simple way for users to report bugs or suggest features directly within Ogeemo.</li>
              <li><strong>Discord/Slack Community:</strong> Create a private community for beta testers to share experiences, ask questions, and connect with the development team.</li>
              <li><strong>Weekly Surveys:</strong> Send short, focused surveys to gauge satisfaction with specific features.</li>
            </ul>
          </PlanDetail>
          <PlanDetail title="Content & Engagement" icon={Mail}>
            <ul>
              <li><strong>Weekly Updates:</strong> Email beta users weekly with updates on bug fixes, new features implemented based on their feedback, and tips on using Ogeemo.</li>
              <li><strong>Identify Champions:</strong> Find the most active and enthusiastic users. These will be your first testimonials and case studies.</li>
            </ul>
          </PlanDetail>
        </PlanSection>
        
        <PlanSection
          phase="Phase 3: Post-Beta"
          title="Launch & Grow"
          objective="Leverage beta success to launch publicly and attract the first wave of paying customers."
          icon={BarChart}
        >
          <PlanDetail title="Launch Strategy" icon={Rocket}>
            <ul>
              <li><strong>Beta User Offer:</strong> Offer a significant "Founder's Discount" to all beta testers as a thank you and to convert them to paying customers.</li>
              <li><strong>Public Announcement:</strong> Announce the official launch on LinkedIn, highlighting key features and quoting testimonials from beta users.</li>
            </ul>
          </PlanDetail>
           <PlanDetail title="Growth Tactics" icon={CheckCircle}>
            <ul>
              <li><strong>Content Marketing:</strong> Start a blog focusing on solving the core pain points of the target audience (e.g., "5 Ways to Streamline Your Invoicing with AI").</li>
              <li><strong>Testimonials & Case Studies:</strong> Feature your beta champions on the website and in marketing materials.</li>
              <li><strong>Iterate on Feedback:</strong> Continue the feedback loop established during the beta to drive the product roadmap.</li>
            </ul>
          </PlanDetail>
        </PlanSection>
      </div>
    </div>
  );
}
