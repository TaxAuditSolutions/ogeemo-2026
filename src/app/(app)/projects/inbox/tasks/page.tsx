
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { ProjectTasksView, ACTION_ITEMS_PROJECT_ID } from '@/components/tasks/project-tasks-view';

function InboxRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    // Rebuild the search parameters for the new URL
    const newParams = new URLSearchParams(searchParams.toString());
    // Redirect to the correct unified task board page for the "Action Items" inbox
    router.replace(`/projects/${ACTION_ITEMS_PROJECT_ID}/tasks?${newParams.toString()}`);
  }, [searchParams, router]);

  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-muted-foreground text-sm font-medium">Redirecting to Inbox...</p>
      </div>
    </div>
  );
}

export default function InboxPage() {
    return (
        <Suspense fallback={
            <div className="flex h-full w-full items-center justify-center p-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
        }>
            <InboxRedirect />
        </Suspense>
    );
}
