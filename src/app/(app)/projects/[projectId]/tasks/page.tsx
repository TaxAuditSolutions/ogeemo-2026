'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { LoaderCircle } from 'lucide-react';
import { getProjectById } from '@/services/project-service';
import { type Project } from '@/types/calendar-types';
import { ProjectManagementHeader } from '@/components/tasks/ProjectManagementHeader';

const ProjectTasksView = dynamic(
  () => import('@/components/tasks/project-tasks-view').then((mod) => mod.ProjectTasksView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading Project Workspace...</p>
        </div>
      </div>
    ),
  }
);

export default function ProjectTaskPage({ params }: { params: { projectId: string } }) {
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    async function fetchProject() {
      if (params.projectId) {
        try {
          const projectData = await getProjectById(params.projectId);
          setProject(projectData);
        } catch (error) {
          console.error("Failed to fetch project:", error);
          // Optionally, handle the error (e.g., show a toast notification)
        }
      }
    }
    fetchProject();
  }, [params.projectId]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ProjectTasksView projectId={params.projectId} />
      </div>
    </div>
  );
}
