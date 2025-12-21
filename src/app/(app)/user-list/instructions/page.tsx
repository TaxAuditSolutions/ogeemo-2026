'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, UserPlus, MoreVertical, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function UserListInstructionsPage() {
    return (
        <div className="p-4 sm:p-6 space-y-6">
            <header className="flex items-center justify-between">
                <div />
                <div className="text-center">
                    <h1 className="text-2xl font-bold font-headline text-primary">
                        About the User List
                    </h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        A guide to managing user records in your application.
                    </p>
                </div>
                <Button asChild variant="outline">
                    <Link href="/user-list">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to User List
                    </Link>
                </Button>
            </header>

            <Card className="max-w-4xl mx-auto">
                 <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <User className="h-6 w-6 text-primary" />
                        A Simple User Management Tool
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                        <p>
                           The User List is a straightforward tool for keeping a basic record of users, such as beta testers, team members, or other contacts relevant to your application.
                        </p>
                    </div>

                    <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <UserPlus className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Adding a User</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>
                                       Clicking the <strong>"Add User"</strong> button opens a dialog where you can enter a name, email, and notes for a new user. Saving this will create a new entry in your user list.
                                    </p>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <Edit className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Editing a User</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>
                                        Use the 3-dot menu (<MoreVertical className="inline h-4 w-4"/>) next to any user and select "Open / Edit". This will open a dialog pre-filled with that user's information, allowing you to make and save changes.
                                    </p>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                         <AccordionItem value="item-3" className="border-b-0">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <Trash2 className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Deleting a User</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>
                                       To remove a user, click the 3-dot menu and select "Delete". You will be asked to confirm before the user record is permanently removed.
                                    </p>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </CardContent>
            </Card>
        </div>
    );
}
