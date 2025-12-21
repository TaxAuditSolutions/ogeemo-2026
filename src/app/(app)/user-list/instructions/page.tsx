
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, UserPlus, MoreVertical, Edit, Trash2, Folder } from "lucide-react";
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
                        A guide to understanding and managing user data records.
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
                        A Simple Data Management Example
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                        <p>
                           The User List is a simplified demonstration of how data can be managed within Ogeemo using the Document Manager as a basic database. Each "user" you create here is actually a simple <code>.txt</code> file stored in a dedicated <strong>"Users"</strong> folder within your <Link href="/document-manager">Document Manager</Link>.
                        </p>
                        <p>
                           This approach shows the flexibility of the system, allowing you to create and manage structured data without needing a formal database for every use case.
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
                                       Clicking the <strong>"Add User"</strong> button opens a dialog where you can enter a name, email, and notes. When you save, this creates a new text file in the "Users" folder. The file name will be the user's name (e.g., <code>John Doe.txt</code>), and the content will be the details you entered.
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
                                        Use the 3-dot menu (<MoreVertical className="inline h-4 w-4"/>) next to any user and select "Open / Edit". This fetches the content of the text file and populates the form, allowing you to make and save changes.
                                    </p>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                         <AccordionItem value="item-3" className="border-b-0">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <Folder className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Viewing in Document Manager</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>
                                       You can navigate to the <Link href="/document-manager">Document Manager</Link> and open the "Users" folder to see all the raw <code>.txt</code> files that make up this list. This demonstrates how different parts of Ogeemo can interact with the same underlying data.
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
