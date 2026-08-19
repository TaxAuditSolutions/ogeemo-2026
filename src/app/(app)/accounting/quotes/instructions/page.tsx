import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronLeft, Info, FileText, TrendingUp, ClipboardList, Receipt, MoreVertical } from 'lucide-react';

export default function QuoteManagerInstructionsPage() {
    return (
        <div className="container mx-auto p-4 md:p-8 space-y-6 max-w-4xl">
            <div className="mb-6">
                <Button variant="ghost" asChild className="mb-4 -ml-4 text-muted-foreground hover:text-foreground">
                    <Link href="/accounting/quotes">
                        <ChevronLeft className="mr-2 h-4 w-4" /> Back to Quote Manager
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <Info className="h-8 w-8 text-primary" />
                    How to Use the Quote Manager
                </h1>
                <p className="text-muted-foreground mt-2">
                    A guide to managing quotes, tracking proposals, and converting them into invoices and work orders.
                </p>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            What is the Quote Manager?
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
                        <p>
                            The Quote Manager is your central hub for creating, tracking, and managing price proposals (quotes) 
                            for your clients. It allows you to move quotes through their entire lifecycle — from initial request 
                            to final payment — while keeping a clear visual pipeline of where each quote stands.
                        </p>
                        <p>
                            Each quote contains details such as the client name, quote number, date, total amount, and current status. 
                            You can also see the associated Work Order number if a quote has been converted into a work order.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            Understanding Quote Statuses
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
                        <p>
                            Quotes move through a natural lifecycle. Each status is represented by a color-coded badge and 
                            a clickable summary card at the top of the page:
                        </p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Requested:</strong> A client has requested a quote, but it hasn't been drafted yet.</li>
                            <li><strong>Draft:</strong> The quote is being prepared but hasn't been sent to the client.</li>
                            <li><strong>Sent:</strong> The quote has been sent to the client and is awaiting a response.</li>
                            <li><strong>Approved:</strong> The client has accepted the quote and it's ready to be invoiced or converted.</li>
                            <li><strong>Work in Progress:</strong> The work described in the quote is actively being carried out.</li>
                            <li><strong>Completed:</strong> The work has been finished but the invoice hasn't been generated yet.</li>
                            <li><strong>Invoiced:</strong> The quote has been converted into an invoice in Accounts Receivable.</li>
                            <li><strong>Paid:</strong> The invoice has been fully paid by the client.</li>
                            <li><strong>Declined:</strong> The client has rejected the quote.</li>
                        </ul>
                        <p>
                            Click any status card to filter the table by that status. Click the <strong>"All Quotes"</strong> card 
                            (or click an active card again) to return to viewing all quotes.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ClipboardList className="h-5 w-5 text-primary" />
                            Creating and Editing Quotes
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Create a Quote:</strong> Click the "Create Quote" button to open the Quote Generator, where you can add line items, set tax rates, and specify the client.</li>
                            <li><strong>Edit a Quote:</strong> Click the pencil icon (on hover) or use the 3-dot menu and select "Edit Quote" to modify an existing quote.</li>
                            <li><strong>Search:</strong> Use the search bar in the top-right of the table to find quotes by number, client name, status, or work order number.</li>
                            <li><strong>Sort:</strong> Click any column header with an arrow icon to sort the table by that field.</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Receipt className="h-5 w-5 text-primary" />
                            Converting Quotes
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
                        <p>
                            Once a quote is approved, you have several conversion options available in the 3-dot menu:
                        </p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Convert to Invoice:</strong> Turns the approved quote into an invoice in Accounts Receivable. The quote status changes to "Invoiced."</li>
                            <li><strong>Convert to Work Order:</strong> Creates a work order from the quote. A Work Order number is saved back to the quote and displayed in the "Work Order #" column. The quote status changes to "Work in Progress."</li>
                            <li><strong>Approve and Create an Invoice:</strong> A shortcut that marks the quote as approved and immediately converts it to an invoice in one step.</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MoreVertical className="h-5 w-5 text-primary" />
                            Using the 3-Dot Menu
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
                        <p>
                            Each quote row has a 3-dot menu on the right side that provides access to all available actions:
                        </p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Edit Quote</strong> — Open the quote in the editor.</li>
                            <li><strong>Mark Approved</strong> — Set the quote status to "Approved."</li>
                            <li><strong>Convert to Invoice</strong> — Create an invoice from the quote.</li>
                            <li><strong>Convert to Work Order</strong> — Create a work order from the quote.</li>
                            <li><strong>Approve and Create an Invoice</strong> — Approve and convert in one step.</li>
                            <li><strong>Mark as [Status]</strong> — Manually set the quote to any status in the lifecycle (Requested, Draft, Sent, Work in Progress, Completed, Invoiced, Paid, Declined).</li>
                            <li><strong>Delete Quote</strong> — Permanently remove the quote. This cannot be undone.</li>
                        </ul>
                        <p>
                            On desktop, you'll also see quick action buttons appear when you hover over a row — these provide 
                            one-click access to the most common actions (Approve, Convert, Edit).
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
