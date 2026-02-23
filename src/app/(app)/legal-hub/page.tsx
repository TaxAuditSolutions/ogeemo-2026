import { Suspense } from 'react';
import { FilesView } from '@/components/files/files-view';

export default function LegalHubPage() {
  // The Legal Hub uses the same robust Document Manager component,
  // but in a real-world scenario, it could be configured to point
  // to a specific, secure root folder like 'legal'.
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
      <FilesView />
    </Suspense>
  );
}
