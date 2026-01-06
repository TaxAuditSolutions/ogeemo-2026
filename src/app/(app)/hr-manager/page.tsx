
'use client';

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
  Users,
  Clock,
  CalendarOff,
  Smartphone,
  Settings,
} from 'lucide-react';
import { HrPageHeader } from '@/components/hr/page-header';

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
      <Button asChild className="w-full bg-[#62C1B6] hover:bg-[#62C1B6]/90">
        <Link href={href}>
          {cta}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </CardFooter>
  </Card>
);

export default function HrHubPage() {
  const features: FeatureCardProps[] = [
    {
      icon: Users,
      title: "Worker Directory",
      description: "Manage worker profiles, contact info, and employment details.",
      href: "/accounting/payroll/manage-workers",
      cta: "Manage Workers",
    },
    {
        icon: Clock,
        title: "Time Log Report",
        description: "Review, manually enter, or adjust hours for all workers before payroll.",
        href: "/reports/time-log",
        cta: "View Time Logs"
    },
    {
      icon: CalendarOff,
      title: "Time Off & Leave",
      description: "Manage worker vacation, sick leave, and other time off requests.",
      href: "/hr-manager/time-off",
      cta: "Manage Leave",
    },
    {
        icon: Smartphone,
        title: "Ogeemo Field App",
        description: "A standalone app for workers to track time and location.",
        href: "/field-app",
        cta: "Open Field App",
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <HrPageHeader pageTitle="HR Hub" />
      <header className="text-center mb-6">
        <div className="flex justify-center items-center gap-4 mb-2">
            <Users className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold font-headline text-primary">
            Human Resources Hub
            </h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Your central command for managing your most valuable asset: your people.
        </p>
         <div className="mt-4">
              <Button asChild variant="outline" className="bg-white text-black border-2 border-black hover:bg-gray-100">
                  <Link href="/hr-manager/manage-navigation">
                    <Settings className="mr-2 h-4 w-4"/>
                    Manage Quick Navigation
                  </Link>
              </Button>
          </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {features.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </div>
    </div>
  );
}
