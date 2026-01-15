'use client';

import React from 'react';
import { InventoryListTest } from '@/components/inventory/InventoryListTest';

export default function InventoryTrackPage() {
  return (
    <div className="p-4 sm:p-6 h-full flex flex-col items-center">
      <header className="w-full text-center mb-6">
        <h1 className="text-3xl font-bold font-headline text-primary">
          Inventory Central
        </h1>
        <p className="text-muted-foreground">
          Manage your items and view their complete transaction history.
        </p>
      </header>
      <div className="w-full max-w-6xl bg-white p-4 rounded-lg shadow-sm">
        <InventoryListTest />
      </div>
    </div>
  );
}
