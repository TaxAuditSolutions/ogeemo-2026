
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users2, Filter, Bot, Mail, Calendar, Calculator, Contact } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FeatureDetail = ({
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


export default function CrmManagerPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
       <header className="text-center">
        <h1 className="text-2xl font-bold font-headline text-primary flex items-center justify-center gap-3">
          <Users2 className="h-8 w-8" />
          Customer Relationship Manager
        </h1>
        <p className="text-muted-foreground max-w-3xl mx-auto mt-2">
          A flexible system for tracking the entire customer journey, from initial lead to loyal client. Turn relationships into revenue.
        </p>
      </header>
      
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Core Features (Coming Soon)</CardTitle>
                <CardDescription>The CRM will be built around three key pillars to manage your sales process.</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full" defaultValue="Sales Funnel Management">
                    <FeatureDetail title="Sales Funnel Management" icon={Filter}>
                        <ul>
                            <li><strong>Visual Pipeline:</strong> Manage leads and opportunities through customizable stages (e.g., New Lead, Contacted, Proposal Sent, Negotiation, Won/Lost) using a drag-and-drop Kanban board.</li>
                            <li><strong>Deal Tracking:</strong> Assign values, probabilities, and expected close dates to each deal to forecast revenue.</li>
                            <li><strong>Activity Logging:</strong> Automatically and manually log every interaction—emails, calls, meetings—associated with a deal.</li>
                        </ul>
                    </FeatureDetail>
                    <FeatureDetail title="Contact & Lead Integration" icon={Contact}>
                        <ul>
                            <li><strong>Unified Contact View:</strong> View a contact's complete history, including all associated deals, logged events from the Client Manager, sent emails, and calendar appointments, all in one place.</li>
                            <li><strong>Lead Scoring:</strong> (Future) Automatically score leads based on their interactions and demographics to prioritize your efforts.</li>
                        </ul>
                    </FeatureDetail>
                     <FeatureDetail title="AI-Powered Automation" icon={Bot}>
                        <ul>
                            <li><strong>Automated Follow-ups:</strong> Let Ogeemo's AI draft follow-up emails based on the last interaction and the current stage of the deal.</li>
                            <li><strong>Task Creation:</strong> Automatically create tasks in your Project Manager (e.g., "Prepare proposal for Client X") when a deal moves to a new stage.</li>
                        </ul>
                    </FeatureDetail>
                </Accordion>
            </CardContent>
        </Card>

        <Card className="border-2 border-primary/20">
            <CardHeader>
                <CardTitle>Deep Integration with Ogeemo</CardTitle>
                <CardDescription>The CRM is not a standalone tool; it's the central hub that connects your customer-facing activities with your back-office operations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg mt-1">
                        <Mail className="h-5 w-5 text-primary"/>
                    </div>
                    <div>
                        <h4 className="font-semibold">OgeeMail & Communications</h4>
                        <p className="text-sm text-muted-foreground">Emails sent and received from a contact will automatically appear in their activity timeline within the CRM. Initiate calls or send messages directly from a deal card.</p>
                    </div>
                </div>
                 <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg mt-1">
                        <Calendar className="h-5 w-5 text-primary"/>
                    </div>
                    <div>
                        <h4 className="font-semibold">Calendar & Projects</h4>
                        <p className="text-sm text-muted-foreground">Schedule meetings directly from the CRM, linking them to a specific deal. When a deal is marked as "Won," automatically trigger the creation of a new project in the Project Manager using a predefined template.</p>
                    </div>
                </div>
                 <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg mt-1">
                        <Calculator className="h-5 w-5 text-primary"/>
                    </div>
                    <div>
                        <h4 className="font-semibold">Accounting Hub</h4>
                        <p className="text-sm text-muted-foreground">Once a deal is won, seamlessly generate the first invoice for the new project in <strong>Accounts Receivable</strong>. All future billing for that client will be tied to both their contact and CRM history.</p>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
