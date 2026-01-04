
'use client';

import { useParams } from 'next/navigation';
import { ProjectTasksView } from '@/components/tasks/project-tasks-view';
import { Suspense } from 'react';
import { LoaderCircle } from 'lucide-react';
import { ProjectManagementHeader } from '@/components/tasks/ProjectManagementHeader';

function ProjectTaskBoardPageContent() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  if (!projectId) {
     return (
       <div className="flex h-full w-full items-center justify-center p-4">
         <div className="text-center">
            <h2 className="text-xl font-semibold">No Project ID Found</h2>
            <p className="text-muted-foreground">Could not determine which project to display.</p>
         </div>
       </div>
     );
  }

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col items-center">
      <div className="w-full max-w-7xl">
        <ProjectManagementHeader projectId={projectId} />
      </div>
      <div className="w-full max-w-7xl flex-1 mt-4">
        <ProjectTasksView projectId={projectId} />
      </div>
    </div>
  );
}


export default function ProjectTaskBoardPage() {
    return (
        <Suspense fallback={
            <div className="flex h-full w-full items-center justify-center p-4">
                <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
            </div>
        }>
            <ProjectTaskBoardPageContent />
        </Suspense>
    );
}
