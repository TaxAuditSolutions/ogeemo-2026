'use client';

import dynamic from 'next/dynamic';
import { LoaderCircle } from 'lucide-react';
import { useParams } from 'next/navigation';

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

export default function ProjectOrganizerPage() {
  // In Client Components, useParams() is the correct hook to get dynamic route segments.
  const params = useParams();
  const projectId = params.projectId as string;
  
  return <ProjectStepsView projectId={projectId} />;
}
