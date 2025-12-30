
'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { LoaderCircle } from 'lucide-react';
import { ProjectManagementHeader } from '@/components/tasks/ProjectManagementHeader';

const ProjectTimelineView = dynamic(
  () => import('@/components/tasks/project-timeline-view').then((mod) => mod.ProjectTimelineView),
  {
    loading: () => (
      <div className="flex h-full w-full items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading Project Timeline...</p>
        </div>
      </div>
    ),
  }
);

export default function ProjectTimelinePage({ params }: { params: { projectId: string } }) {
  const [projectId, setProjectId] = useState<string>('');

  useEffect(() => {
    // This resolves the `params` promise when the component mounts
    const resolveParams = async () => {
        const resolvedParams = await params;
        setProjectId(resolvedParams.projectId);
    };
    resolveParams();
  }, [params]);

  if (!projectId) {
      return (
          <div className="flex h-full w-full items-center justify-center p-4">
            <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
          </div>
      );
  }

  return (
    <div className="h-full flex flex-col p-4 sm:p-6 space-y-4">
        <header className="text-center">
            <h1 className="text-3xl font-bold font-headline text-primary">
                Project Timeline
            </h1>
            <p className="text-muted-foreground">Here is where you do the planning of your specific project. </p>
        </header>

        <ProjectManagementHeader projectId={projectId} />

        <div className="flex-1 min-h-0">
            <ProjectTimelineView projectId={projectId} />
        </div>
    </div>
  );
}
