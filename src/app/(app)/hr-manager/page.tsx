
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Contact2, FileText, CalendarOff, Banknote, Clock, Calculator, MapPin } from "lucide-react";
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

export default function HrManagerPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
       <header className="text-center">
        <h1 className="text-2xl font-bold font-headline text-primary flex items-center justify-center gap-3">
          <Contact2 className="h-8 w-8" />
          HR Manager
        </h1>
        <p className="text-muted-foreground max-w-3xl mx-auto mt-2">
          Your central hub for managing your most valuable asset—your people. Streamline employee information, time off, and payroll processes.
        </p>
      </header>
      
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Core Features (Coming Soon)</CardTitle>
                <CardDescription>A simple yet powerful set of tools to manage your team effectively.</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full" defaultValue="Employee Directory & Records">
                    <FeatureDetail title="Employee Directory & Records" icon={Contact2}>
                        <ul>
                            <li><strong>Centralized Profiles:</strong> Keep a secure record for each employee, including contact information, start date, role, and compensation details.</li>
                            <li><strong>Emergency Contacts:</strong> Store and easily access emergency contact information.</li>
                            <li><strong>Team Directory:</strong> A simple, searchable directory of all team members.</li>
                        </ul>
                    </FeatureDetail>
                    <FeatureDetail title="Time Off Management" icon={CalendarOff}>
                        <ul>
                            <li><strong>Leave Requests:</strong> Employees can submit requests for vacation, sick leave, or personal days.</li>
                            <li><strong>Approval Workflow:</strong> Managers can approve or deny leave requests with a single click.</li>
                            <li><strong>Shared Calendar:</strong> Approved time off will automatically appear on a shared team calendar to improve visibility and planning.</li>
                        </ul>
                    </FeatureDetail>
                     <FeatureDetail title="Payroll & Compensation Hub" icon={Banknote}>
                        <ul>
                            <li><strong>Salary & Wage Tracking:</strong> Securely track compensation history for each employee.</li>
                            <li><strong>Payroll Integration:</strong> (Future) Connect with payroll providers to streamline the process of running payroll based on timesheets and salaries.</li>
                            <li><strong>Expense Reimbursements:</strong> Manage and approve employee expense claims.</li>
                        </ul>
                    </FeatureDetail>
                    <FeatureDetail title="Document Management" icon={FileText}>
                        <ul>
                            <li><strong>Secure Storage:</strong> Store important documents like employment contracts, performance reviews, and policy acknowledgements in the employee's profile.</li>
                            <li><strong>Access Control:</strong> Ensure that sensitive documents are only accessible to authorized personnel.</li>
                        </ul>
                    </FeatureDetail>
                     <FeatureDetail title="Mobile Employee GPS Tracking" icon={MapPin}>
                        <ul>
                            <li><strong>Mobile Check-in/out:</strong> Employees can clock in and out from job sites using their mobile device, capturing precise location and time data.</li>
                            <li><strong>Live Route Tracking:</strong> View employee locations in real-time on a map to optimize routes and manage dispatching for service calls.</li>
                            <li><strong>Job Site Geofencing:</strong> (Future) Create virtual boundaries around job sites to automatically log arrival and departure times.</li>
                            <li><strong>Automated Timesheets:</strong> GPS data automatically populates timesheets in the <strong>Time Manager</strong>, ensuring accurate payroll and client billing.</li>
                        </ul>
                    </FeatureDetail>
                </Accordion>
            </CardContent>
        </Card>

        <Card className="border-2 border-primary/20">
            <CardHeader>
                <CardTitle>Integrated for Efficiency</CardTitle>
                <CardDescription>The HR Manager works with other Ogeemo tools to save you time and reduce manual data entry.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg mt-1">
                        <Clock className="h-5 w-5 text-primary"/>
                    </div>
                    <div>
                        <h4 className="font-semibold">Time Manager</h4>
                        <p className="text-sm text-muted-foreground">Employee timesheets from the Time Manager can be used to calculate hours for payroll, providing accurate data for compensation.</p>
                    </div>
                </div>
                 <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg mt-1">
                        <Calculator className="h-5 w-5 text-primary"/>
                    </div>
                    <div>
                        <h4 className="font-semibold">Accounting Hub</h4>
                        <p className="text-sm text-muted-foreground">Once payroll is processed, the total salary and benefit amounts will automatically create expense entries in your <strong>General Ledger</strong>, keeping your financial records up-to-date.</p>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
