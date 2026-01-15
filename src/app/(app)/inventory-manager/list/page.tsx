'use client';

import React from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export default function InventoryListPage() {
  return (
    <div className="p-4 sm:p-6 h-full flex flex-col items-center">
      <header className="w-full text-center mb-6">
        <h1 className="text-3xl font-bold font-headline text-primary">
          The Complete List
        </h1>
      </header>
      <ResizablePanelGroup
        direction="horizontal"
        className="w-full flex-1 rounded-lg border"
      >
        <ResizablePanel defaultSize={100}>
          <div className="flex h-full items-center justify-center p-6">
            <span className="font-semibold">Panel</span>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
