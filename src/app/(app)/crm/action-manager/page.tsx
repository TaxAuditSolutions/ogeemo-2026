
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UserPlus, MailQuestion, BarChartHorizontal, ArrowRight } from "lucide-react";
import Link from "next/link";
import { type LucideIcon } from "lucide-react";
import { Pipeline } from "lucide-react";


interface CrmAction {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
}

const crmActions: CrmAction[] = [
  {
    icon: UserPlus,
    title: "New Lead",
    description: "Add a new potential customer to your sales funnel.",
    href: "/contacts" 
  },
  {
    icon: Pipeline,
    title: "Sales Pipeline",
    description: "Visualize and manage deals through your sales stages.",
    href: "#"
  },
  {
    icon: MailQuestion,
    title: "Follow-ups",
    description: "View and manage scheduled follow-up activities.",
    href: "#"
  },
  {
    icon: BarChartHorizontal,
    title: "CRM Reports",
    description: "Analyze sales performance and pipeline metrics.",
    href: "#"
  }
];

export default function CrmActionManagerPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div />
        <div className="text-center">
          <h1 className="text-2xl font-bold font-headline text-primary">
            CRM Action Manager
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Your command center for customer relationship management activities.
          </p>
        </div>
        <Button asChild variant="outline">
            <Link href="/crm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to CRM Hub
            </Link>
        </Button>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {crmActions.map(action => {
            const { icon: Icon } = action;
            return (
              <Card key={action.title} className="flex flex-col">
                <CardHeader>
                   <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                            <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle>{action.title}</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="flex-1">
                    <CardDescription>{action.description}</CardDescription>
                </CardContent>
                <CardFooter>
                     <Button asChild className="w-full">
                      <Link href={action.href}>
                        Go <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                </CardFooter>
              </Card>
            );
        })}
      </div>
    </div>
  );
}
