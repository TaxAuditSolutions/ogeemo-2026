
import dynamic from 'next/dynamic';
import { LoaderCircle } from 'lucide-react';

// This file is slated for deletion.

export default function AdvancedPayrollPage() {
  return (
      <div className="flex h-full w-full items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading Advanced Payroll...</p>
        </div>
      </div>
    );
}
