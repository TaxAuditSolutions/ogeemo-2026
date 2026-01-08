
'use client';

import dynamic from 'next/dynamic';
import { LoaderCircle, Route, ArrowLeft } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import React, { Suspense, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { type Project, getProjectById } from '@/services/project-service';


const ProjectStepsView = dynamic(
  () => import('@/components/tasks/project-steps-view').then(mod => mod.default),
  {
    loading: () => (
      <div className="flex h-full w-full items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading Project Planner...</p>
        </div>
      </div>
    ),
  }
);

function ProjectPlanPageContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (projectId) {
      getProjectById(projectId).then(data => {
        setProject(data);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, [projectId]);
  
  if (!projectId) {
     return (
       <div className="flex h-full w-full items-center justify-center p-4">
         <div className="text-center">
            <h2 className="text-xl font-semibold">No Project Selected</h2>
            <p className="text-muted-foreground">Please return to the project list and select a project to plan.</p>
             <Button asChild variant="outline" className="mt-4">
                <Link href="/projects/all">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Project List
                </Link>
            </Button>
         </div>
       </div>
     );
  }

  return (
    <div className="w-full h-full px-12 mx-auto py-6 flex flex-col items-center">
      <header className="w-full max-w-7xl flex justify-between items-center mb-6">
        <Button asChild variant="outline">
            <Link href="/projects/all">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Project List
            </Link>
        </Button>
        <div className="text-center">
            <h1 className="text-4xl font-bold font-headline text-primary">Project Planner</h1>
            {isLoading ? (
              <div className="h-6 w-48 bg-gray-200 animate-pulse rounded-md mx-auto mt-1" />
            ) : (
              <p className="text-muted-foreground">{project?.name}</p>
            )}
        </div>
        <div className="w-48 flex justify-end">
          {projectId && (
            <Button asChild variant="outline">
                <Link href={`/projects/${projectId}/tasks`}>
                     Back to Task Board <Route className="ml-2 h-4 w-4" />
                </Link>
            </Button>
          )}
        </div>
      </header>
      <div className="w-full flex-1 flex justify-center">
        <ProjectStepsView projectId={projectId} />
      </div>
    </div>
  );
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
