'use client';

import React from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
    ArrowLeft, 
    UserPlus, 
    ShieldCheck, 
    Database, 
    Users, 
} from "lucide-react";

export default function UserManagerInstructionsPage() {
    return (
        <div className="p-4 sm:p-6 space-y-6">
            <header className="flex items-center justify-between">
                <div className="flex-1" />
                <div className="text-center flex-1">
                    <h1 className="text-2xl font-bold font-headline text-primary">
                        User Management Protocol
                    </h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Your guide to expanding your team and understanding data boundaries.
                    </p>
                </div>
                <div className="flex-1 flex justify-end">
                    <Button asChild variant="outline">
                        <Link href="/user-manager">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Manager
                        </Link>
                    </Button>
                </div>
            </header>

            <div className="max-w-4xl mx-auto space-y-8 pb-12">
                <Card className="border-2 border-primary/10">
                    <CardHeader className="bg-primary/5 border-b">
                        <CardTitle className="flex items-center gap-3">
                            <Database className="h-6 w-6 text-primary" />
                            The Company Silo Paradigm
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <p className="text-lg leading-relaxed">
                                Ogeemo operates on a <strong>Multi-Tenant Silo Structure</strong>. When a company or individual originally signs up for Ogeemo, a completely isolated database instance is created for them. Workspaces are strictly separated.
                            </p>
                            <p className="text-lg leading-relaxed text-muted-foreground">
                                This strict partitioning means that a user in your company cannot see, query, or interact with data from any other company. To expand your team, new users <strong>must be invited by an Administrator</strong> directly from the inside of your existing workspace.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                            Central Operations & Hierarchy
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
                            <AccordionItem value="item-1">
                                <AccordionTrigger>
                                    <div className="flex items-center gap-3">
                                        <UserPlus className="h-5 w-5 text-primary"/>
                                        <span className="font-semibold">Adding a New User (Setup Flow)</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                        <p>Standard users cannot join your company database from the public sign-up page. To add a team member:</p>
                                        <ol>
                                            <li>Navigate to the <strong>User Manager</strong> dashboard.</li>
                                            <li>Click the <strong>"+ Add User"</strong> button.</li>
                                            <li>Fill out the user's name, email, and assign them a role.</li>
                                        </ol>
                                        <p>Our system automatically dual-provisions their secure login credentials and provisions their node in the Contact Hub. They will receive an email with instructions to securely log in.</p>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="item-2">
                                <AccordionTrigger>
                                    <div className="flex items-center gap-3">
                                        <Users className="h-5 w-5 text-primary"/>
                                        <span className="font-semibold">Levels of Authority (Roles)</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                        <p>Every member of a Company instance shares access to the Company's tools and data features, governed strictly by their assigned role:</p>
                                        <ul>
                                            <li><strong>Admin:</strong> Has full, unrestricted system access. Admins are the only users who can access the User Manager, view company-wide billing, and invite/delete team members.</li>
                                            <li><strong>Editor:</strong> Has comprehensive operational access. Editors can view and modify Project boards, the Command Centre calendar, Ledger finances, and the Document hub.</li>
                                            <li><strong>Viewer:</strong> Has read-only access to operational features. They can see data but cannot make changes, which is beneficial for temporary contactors or auditing purposes.</li>
                                        </ul>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="item-3" className="border-b-0">
                                <AccordionTrigger>
                                    <div className="flex items-center gap-3">
                                        <Database className="h-5 w-5 text-primary"/>
                                        <span className="font-semibold">Dealing with External Users</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                        <p>If a team member attempts to sign up independently on the public Ogeemo portal, the system will assume they are starting a <em>new, separate company</em> and will generate a siloed database for them.</p>
                                        <p className="text-muted-foreground border-l-4 border-destructive pl-4 mt-4">
                                            <strong>Recovery Rule:</strong> Users sitting in different databases cannot communicate or share data with your company. If this happens, you must explicitly invite their email address from your User Manager panel. They will then have to log into your workspace via the specific team portal link.
                                        </p>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
