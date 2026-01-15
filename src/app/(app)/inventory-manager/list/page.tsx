'use client';

import React from 'react';
import { InventoryListTest } from '@/components/inventory/InventoryListTest';

export default function InventoryListPage() {
  return (
    <div className="p-4 sm:p-6 h-full flex flex-col items-center">
      <header className="w-full text-center mb-6">
        <h1 className="text-3xl font-bold font-headline text-primary">
          The Complete List
        </h1>
      </header>
      <div className="w-full max-w-6xl">
        <InventoryListTest />
      </div>
    </div>
  );
}
