
'use client';

import dynamic from 'next/dynamic';
import { LoaderCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const ProjectStepsView = dynamic(
  () => import('@/components/tasks/project-steps-view').then(mod => mod.default),
  {
    loading: () => (
      <div className="flex h-full w-full items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading Project Organizer...</p>
        </div>
      </div>
    ),
  }
);

function ProjectPlanPageContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  
  if (!projectId) {
     return (
       <div className="flex h-full w-full items-center justify-center p-4">
         <div className="text-center">
            <h2 className="text-xl font-semibold">No Project Selected</h2>
            <p className="text-muted-foreground">Please return to the project list and select a project to plan.</p>
         </div>
       </div>
     );
  }

  return <ProjectStepsView projectId={projectId} />;
}


export default function ProjectPlanPage() {
    return (
        <Suspense fallback={
            <div className="flex h-full w-full items-center justify-center p-4">
                <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
            </div>
        }>
            <ProjectPlanPageContent />
        </Suspense>
    );
}
