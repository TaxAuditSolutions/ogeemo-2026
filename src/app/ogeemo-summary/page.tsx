import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function OgeemoSummaryPage() {
    return (
        <main className="container mx-auto px-4 py-8 md:py-16">
            <div className="max-w-4xl mx-auto">
                <Button asChild variant="outline" className="mb-4">
                    <Link href="/home">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Home
                    </Link>
                </Button>
                <Card>
                    <CardHeader className="text-center">
                        <CardTitle className="text-3xl font-bold font-headline text-primary">Ogeemo Application Summary</CardTitle>
                        <CardDescription className="italic">
                            This document provides a high-level overview of the Ogeemo application's purpose, structure, and core principles. It serves as a condensed knowledge base for development and disaster recovery.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                        <h2>1. Core Philosophy</h2>
                        <p>
                            Ogeemo is designed as a unified, all-in-one business management platform with a strong emphasis on simplicity and user experience. The primary goal is to provide a powerful, intuitive tool for small businesses, freelancers, and accountants to manage their operations without being overwhelmed by complexity.
                        </p>
                        <p>Key principles include:</p>
                        <ul>
                            <li><strong>Unified Platform:</strong> Replace the need for multiple, disparate applications by integrating Accounting, Project Management, CRM, and Communications into a single dashboard.</li>
                            <li><strong>User-Centric Design:</strong> Prioritize intuitive workflows and guided actions over feature-heavy, cluttered interfaces.</li>
                            <li><strong>Deep Google Integration:</strong> Leverage Google Workspace for core functionalities like authentication, email, calendar, and file storage to create a seamless user experience.</li>
                            <li><strong>AI as a Partner:</strong> Utilize AI not just as a chatbot, but as an integrated assistant that understands context, automates tedious tasks, and provides intelligent insights.</li>
                        </ul>

                        <h2>2. Key Modules & Managers</h2>
                        <p>The application is structured around several core hubs, each managing a distinct area of a business.</p>

                        <h3>Action Manager</h3>
                        <ul>
                            <li>The central dashboard and primary user interface.</li>
                            <li>Provides quick access to common actions and an overview of workspace activity.</li>
                            <li>Features a customizable set of "Action Chips" for shortcuts to frequently used managers.</li>
                        </ul>

                        <h3>Accounting Hub</h3>
                        <p>Organized into two main sections to cater to different user needs:</p>
                        <ul>
                            <li><strong>BKS (Bookkeeping Kept Simple):</strong> A simplified, cash-based accounting system focused on core income and expense ledgers. Designed to be intuitive for non-accountants and ensure books are audit-ready by default.</li>
                            <li><strong>Advanced Tools:</strong> A comprehensive suite of traditional accounting modules, including Accounts Receivable & Invoicing, Accounts Payable, Payroll, Asset Management, and Reporting.</li>
                        </ul>

                        <h3>Project & Task Management</h3>
                        <ul>
                            <li><strong>Project Manager:</strong> A hub for viewing and managing all projects.</li>
                            <li><strong>Task Board:</strong> A Kanban-style board (To Do, In Progress, Done) for managing the day-to-day tasks within a specific project.</li>
                            <li><strong>Project Planning:</strong> A dedicated view for defining the steps and timeline of a project.</li>
                        </ul>

                        <h3>Communications & Relationships</h3>
                        <ul>
                            <li><strong>OgeeMail:</strong> An integrated email client for managing business communications.</li>
                            <li><strong>Contacts Manager:</strong> A central database for all clients, vendors, and personal contacts.</li>
                            <li><strong>Calendar:</strong> A tool for managing schedules, appointments, and events.</li>
                            <li><strong>CRM (Customer Relationship Manager):</strong> A planned module to track the entire customer journey.</li>
                        </ul>

                        <h3>Utility Managers</h3>
                        <ul>
                            <li><strong>File Manager:</strong> A secure place for document storage and organization.</li>
                            <li><strong>Time Manager:</strong> Track time spent on tasks, associate it with clients, and mark it as billable.</li>
                            <li><strong>Research Hub:</strong> An AI-powered workspace to manage sources and synthesize information.</li>
                        </ul>

                        <h2>3. AI Integration (Firebase Genkit)</h2>
                        <p>
                            Ogeemo's intelligence is powered by Firebase Genkit. The AI is designed to be more than just a chatbot; it's an assistant integrated into the workflow.
                        </p>
                        <ul>
                            <li><strong>Ogeemo Assistant:</strong> A knowledgeable chatbot trained on application documentation.</li>
                            <li><strong>Tool-Based Actions:</strong> The AI can use "tools" to perform actions on behalf of the user.</li>
                            <li><strong>Content Generation:</strong> AI is used to generate forms, images, and other content.</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
