
'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench, ArrowRight, Package } from "lucide-react";
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
            <CardTitle>Core Features</CardTitle>
            <CardDescription>This manager is built around a complete transactional log for all inventory items.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <FeatureDetail title="Item & Supply Tracking" icon={Wrench}>
                <ul>
                  <li><strong>Centralized Item Catalog:</strong> Maintain a master list of all items, whether for resale, internal use, or project work.</li>
                  <li><strong>Real-Time Stock Levels:</strong> Track quantities on hand based on a full transaction history.</li>
                  <li><strong>Categorization:</strong> Organize items by type (e.g., Product, Supply, Material) for accurate accounting and reporting.</li>
                </ul>
              </FeatureDetail>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
