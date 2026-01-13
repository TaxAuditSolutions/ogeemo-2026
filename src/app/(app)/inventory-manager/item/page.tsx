'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ItemFormPage() {
  const router = useRouter();

  return (
    <div className="p-4 sm:p-6 flex flex-col items-center h-full">
      <header className="w-full max-w-2xl text-center relative mb-6">
        <div className="absolute left-0 top-1/2 -translate-y-1/2">
            <Button asChild variant="outline">
                <Link href="/inventory-manager/track">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Inventory
                </Link>
            </Button>
        </div>
        <h1 className="text-3xl font-bold font-headline text-primary">
          Add/Edit Item
        </h1>
      </header>

      {/* The form card has been removed as requested. */}
      
    </div>
  );
}
