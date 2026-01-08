'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Test102Page() {
  return (
    <div className="p-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold font-headline text-primary">
          Test 102
        </h1>
        <Button asChild variant="outline">
          <Link href="/projects/all">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Project List
          </Link>
        </Button>
      </header>
      <div className="p-8 border-2 border-dashed rounded-lg text-center">
        <p>This is the Test 102 page.</p>
        <div className="mt-4 space-y-2 text-left max-w-sm mx-auto">
            <Label htmlFor="test-info">Test info</Label>
            <Input id="test-info" placeholder="Enter test info..." />
        </div>
      </div>
    </div>
  );
}
