
'use client';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UserPlus, ListPlus, WandSparkles, FileDown, Save } from "lucide-react";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { InvoicePageHeader } from "@/components/accounting/invoice-page-header";

export default function InvoiceInstructionsPage() {
    return (
        <div className="p-4 sm:p-6 space-y-6">
            <InvoicePageHeader pageTitle="Instructions" />

            <header className="text-center">
                <h1 className="text-2xl font-bold font-headline text-primary">
                    How to Use the Invoice Generator
                </h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                    A step-by-step guide to creating, customizing, and saving your invoices.
                </p>
            </header>

            <Card className="max-w-4xl mx-auto">
                <CardContent className="p-6">
                    <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <UserPlus className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Step 1: Select a Client</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>
                                        Start by selecting the client you want to invoice.
                                    </p>
                                    <ul>
                                        <li><strong>Select Company:</strong> Use the first dropdown to choose the company. If you're billing an individual not associated with a company, select "-- Individual Contacts --".</li>
                                        <li><strong>Select Contact:</strong> Once a company is chosen, the second dropdown will populate with the contacts associated with it. Select the specific person you are billing.</li>
                                        <li><strong>Add New Contact:</strong> If the contact doesn't exist, click the "+ Add New Contact" button to create them on the fly.</li>
                                    </ul>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <ListPlus className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Step 2: Add Line Items</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>
                                        Click the <strong>"+ Add Line Item"</strong> button to open a dialog where you can add services or products to the invoice.
                                    </p>
                                    <ul>
                                        <li><strong>Search Repeatable Items:</strong> Quickly find and add services you've saved before.</li>
                                        <li><strong>Enter Details:</strong> Fill in the description, quantity, and price.</li>
                                        <li><strong>Manage Taxes:</strong> Select a tax type from the dropdown. If you need a new tax type, click the "Settings" icon next to the dropdown to open the Tax Manager.</li>
                                        <li><strong>Save as Repeatable:</strong> Check the box at the bottom to save the current item for future use.</li>
                                    </ul>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                         <AccordionItem value="item-3">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <WandSparkles className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Step 3: Customize Details</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>
                                       Fine-tune the invoice to fit your needs.
                                    </p>
                                     <ul>
                                        <li><strong>Invoice & BN #:</strong> The Invoice # is generated automatically, but you can override it. The Business Number (BN) is pulled from the contact or your profile but can also be changed.</li>
                                        <li><strong>Dates & Terms:</strong> Set the Invoice Date and Payment Terms. The Due Date will update automatically based on your selection.</li>
                                        <li><strong>Notes / Terms:</strong> Add a personal message, payment instructions, or your standard terms and conditions. Hover over the "Info" icon for standard interest terms you can use.</li>
                                    </ul>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                         <AccordionItem value="item-4" className="border-b-0">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <Save className="h-5 w-5 text-primary"/>
                                    <span className="font-semibold">Step 4: Preview & Save</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>
                                        Once your invoice is ready, use the buttons at the top right to finalize it.
                                    </p>
                                     <ul>
                                        <li><strong><FileDown className="inline-block h-4 w-4 mr-1"/> Download PDF:</strong> This opens the print dialog, allowing you to save the invoice as a PDF, which you can then attach to an email.</li>
                                        <li><strong><Save className="inline-block h-4 w-4 mr-1"/> Save Invoice:</strong> This saves the invoice to your Accounts Receivable and moves you to that page to see your list of outstanding invoices.</li>
                                    </ul>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </CardContent>
            </Card>
        </div>
    );
}
