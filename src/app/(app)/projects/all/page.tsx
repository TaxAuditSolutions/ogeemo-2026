'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { LoaderCircle } from 'lucide-react';

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
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><LoaderCircle className="h-10 w-10 animate-spin text-primary" /></div>}>
      <div className="p-4 sm:p-6 space-y-6">
        <ProjectListView />
      </div>
    </Suspense>
  );
}
