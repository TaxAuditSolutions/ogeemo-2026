
'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { LoaderCircle, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { ProjectManagementHeader } from '@/components/tasks/ProjectManagementHeader';

const ProjectTimelineView = dynamic(
  () => import('@/components/tasks/project-timeline-view').then((mod) => mod.ProjectTimelineView),
  {
    ssr: false,
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
  const projectIdToShow = params.projectId === 'placeholder' ? '' : params.projectId;

  return (
    <div className="h-full flex flex-col p-4 sm:p-6 space-y-4">
        <header className="text-center">
            <h1 className="text-3xl font-bold font-headline text-primary">
                Project Timeline
            </h1>
            <p className="text-muted-foreground">A high-level view of your project's phases and schedule.</p>
        </header>

        <ProjectManagementHeader projectId={projectIdToShow} />

        <div className="flex-1 min-h-0">
            <ProjectTimelineView projectId={projectIdToShow} />
        </div>
    </div>
  );
}
