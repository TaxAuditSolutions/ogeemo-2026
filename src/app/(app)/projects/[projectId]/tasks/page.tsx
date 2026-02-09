
'use client';

import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { LoaderCircle, Route, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const ProjectTasksView = dynamic(
  () => import('@/components/tasks/project-tasks-view').then((mod) => mod.ProjectTasksView),
  {
    loading: () => (
      <div className="flex h-full w-full items-center justify-center p-4">
        <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
      </div>
    ),
  }
);

export default function ProjectTaskBoardPage() {
    const params = useParams();
    const projectId = params.projectId as string;

    return (
        <div className="p-4 sm:p-6 space-y-4 flex flex-col items-center h-full">
            <header className="w-full max-w-7xl flex justify-between items-center">
                <Button asChild variant="outline">
                    <Link href="/projects/all">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Project List
                    </Link>
                </Button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold font-headline text-primary">Project Board</h1>
                </div>
                <div className="w-48 flex justify-end">
                    <Button asChild variant="outline">
                        <Link href={`/project-plan?projectId=${projectId}`}>
                            Back to Planner <Route className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </header>
            
            <ProjectTasksView projectId={projectId} />
        </div>
    );
}
