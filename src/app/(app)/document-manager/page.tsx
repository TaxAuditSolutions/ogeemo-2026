import { Suspense } from 'react';
import { FilesView } from '@/components/files/files-view';

export default function DocumentManagerPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
      <FilesView />
    </Suspense>
  );
}
