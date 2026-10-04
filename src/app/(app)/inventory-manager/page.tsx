'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench, ArrowRight, Package } from "lucide-react";

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
                Go to Inventory Central <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Learn the Inventory Manager</CardTitle>
            <CardDescription>Adding items, updating stock, and reading the transaction history — step by step.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/learn/guides/inventory">
                Open the guide <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
