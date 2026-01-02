
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

export default function ProjectOrganizerPage({ params }: { params: { projectId: string } }) {
  // Although useParams can also work, passing params directly from the page props
  // is a more standard and reliable way to handle dynamic route segments in Next.js.
  const projectId = params.projectId;
  return <ProjectStepsView projectId={projectId} />;
}
