"use client";

import React from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Briefcase,
  ListTodo,
  Clock,
  Calendar,
  BrainCircuit,
} from 'lucide-react';

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  cta: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, description, href, cta }) => (
  <Card className="flex flex-col">
    <CardHeader>
      <div className="flex items-start gap-4">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="mt-1">{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="flex-1" />
    <CardFooter>
      <Button asChild className="w-full">
        <Link href={href}>
          {cta}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </CardFooter>
  </Card>
);

export function MasterMindView() {
  const features = [
    { icon: Briefcase, title: "Project Manager", description: "Oversee all your high-level projects. Click a project to see its detailed task board.", href: "/projects", cta: "Go to Projects" },
    { icon: ListTodo, title: "Task & Event List", description: "View a comprehensive list of every task and event across all projects and your calendar.", href: "/tasks", cta: "View All Tasks" },
    { icon: Clock, title: "Time Manager", description: "Track time against tasks in real-time or log past work. This is also where you schedule new events.", href: "/time", cta: "Manage Time & Events" },
    { icon: Calendar, title: "Calendar View", description: "See all your scheduled tasks and events in a visual, drag-and-drop calendar.", href: "/calendar", cta: "Open Calendar" },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <header className="text-center mb-6">
        <div className="flex justify-center items-center gap-4 mb-2">
            <BrainCircuit className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold font-headline text-primary">
            The Master Mind
            </h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          This is your central command hub for all activities. Projects, tasks, and calendar events are now unified. What you create in one place will be reflected everywhere.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {features.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </div>
    </div>
  );
}
