
'use client';

import { redirect, useSearchParams } from 'next/navigation';
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

  return null; // This component doesn't render anything, it just redirects.
}

// The Inbox now uses the main ProjectTasksView component, passing a special projectId.
export default function InboxPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <InboxRedirect />
        </Suspense>
    );
}
