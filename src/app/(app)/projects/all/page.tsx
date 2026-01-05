
'use client';

import dynamic from 'next/dynamic';
import { LoaderCircle } from 'lucide-react';
import { Briefcase } from 'lucide-react';

const ProjectListView = dynamic(
  () => import('@/components/tasks/project-list-view').then((mod) => mod.ProjectListView),
  {
    loading: () => (
      <div className="flex h-full w-full items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading Projects...</p>
        </div>
      </div>
    ),
  }
);

export default function AllProjectsListPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
       <header className="text-center mb-6">
          <div className="flex justify-center items-center gap-4 mb-2">
              <Briefcase className="h-10 w-10 text-primary" />
              <h1 className="text-4xl font-bold font-headline text-primary">
                Project List
              </h1>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A complete list of all your projects. Click a project to view its task board.
          </p>
        </header>
      <ProjectListView />
    </div>
  );
}
