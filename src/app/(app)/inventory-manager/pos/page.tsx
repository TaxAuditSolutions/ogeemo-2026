'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PointOfSalePage() {
  return (
    <div className="p-4 sm:p-6">
      <header className="text-center mb-6">
        <h1 className="text-3xl font-bold font-headline text-primary">Point of Sale</h1>
        <p className="text-muted-foreground">Record sales and automatically update inventory.</p>
      </header>
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>New Sale</CardTitle>
        </CardHeader>
        <CardContent>
          <p>POS form will be built here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
