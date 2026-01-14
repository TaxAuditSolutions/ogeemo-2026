
'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench, ArrowRight, Package, PlusCircle, PenSquare, History } from "lucide-react";
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

export default function InventoryManagerPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold font-headline text-primary flex items-center justify-center gap-3">
          <Package className="h-8 w-8" />
          Inventory Manager
        </h1>
        <p className="text-muted-foreground max-w-3xl mx-auto mt-2">
          A flexible system for tracking everything your business uses and sells—from retail products to office supplies and project materials.
        </p>
        <div className="mt-4 flex justify-center gap-4">
          <Button asChild size="lg">
              <Link href="/inventory-manager/track">
                Manage Inventory & View Log <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>How to Use the Inventory Manager</CardTitle>
            <CardDescription>A step-by-step guide to managing your inventory effectively.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
              <FeatureDetail title="Adding Items" icon={PlusCircle}>
                <p>There are two ways to add a new item to your inventory:</p>
                <ul>
                  <li><strong>Quick Add:</strong> On the 'Inventory Central' page, use the "Add New Item" card to quickly create an item with a name and a starting quantity of zero.</li>
                  <li><strong>Detailed Add:</strong> Click the "Add/Update Item Stock" button to open a dialog where you can enter comprehensive details like SKU, cost, supplier, and an initial stock quantity.</li>
                </ul>
              </FeatureDetail>
              <FeatureDetail title="Updating Stock Levels" icon={PenSquare}>
                <p>To change the stock quantity for an existing item:</p>
                <ul>
                    <li>Use the "Update Existing Item Stock" card. Search for your item, and the item form will open, pre-filled with its details.</li>
                    <li>Simply change the "Quantity" field to the new total amount on hand.</li>
                    <li>Ogeemo automatically calculates the change (+ or -) and creates a new entry in the transaction log with the reason "Adjustment".</li>
                </ul>
              </FeatureDetail>
              <FeatureDetail title="Viewing Transaction History" icon={History}>
                <p>Every change to an item's stock is recorded, creating a complete audit trail.</p>
                <ul>
                  <li>On the 'Inventory Central' page, click on any item in the main list to filter the "Transaction Log" below.</li>
                  <li>Alternatively, use the 3-dot menu on any item and select "View History" to see the log in a focused dialog.</li>
                  <li>Each log entry shows the reason for the change (e.g., Initial Stock, Purchase, Sale, Adjustment), the quantity change, and the new total.</li>
                </ul>
              </FeatureDetail>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
