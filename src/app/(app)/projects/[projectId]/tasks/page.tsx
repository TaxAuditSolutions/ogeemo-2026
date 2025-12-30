
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
    loading: () => (
      <div className="flex h-full w-full items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading Project Status...</p>
        </div>
      </div>
    ),
  }
);

export default function ProjectTaskPage({ params }: { params: { projectId: string } }) {
  const [project, setProject] = useState<Project | null>(null);
  const [projectId, setProjectId] = useState<string>('');

  useEffect(() => {
    // This resolves the `params` promise when the component mounts
    const resolveParams = async () => {
        const resolvedParams = await params;
        setProjectId(resolvedParams.projectId);
    };
    resolveParams();
  }, [params]);

  useEffect(() => {
    async function fetchProject() {
      if (projectId) {
        try {
          const projectData = await getProjectById(projectId);
          setProject(projectData);
        } catch (error) {
          console.error("Failed to fetch project:", error);
          // Optionally, handle the error (e.g., show a toast notification)
        }
      }
    }
    fetchProject();
  }, [projectId]);

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
          Project Status
        </h1>
        {project && (
          <h2 className="text-xl text-muted-foreground">{project.name}</h2>
        )}
      </header>
      <ProjectManagementHeader projectId={projectId} />
      <div className="flex-1 min-h-0">
        <ProjectTasksView projectId={projectId} />
      </div>
    </div>
  );
}
