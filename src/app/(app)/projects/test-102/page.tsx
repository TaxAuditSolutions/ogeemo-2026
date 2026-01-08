'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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
      </div>
    </div>
  );
}
