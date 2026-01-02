
'use client';

import { redirect, useParams } from 'next/navigation';

export default function ProjectTimelineRedirectPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  // The main view for a project is now the tasks Kanban board.
  // Redirect users there to avoid confusion.
  if (projectId) {
    redirect(`/projects/${projectId}/tasks`);
  } else {
    redirect('/projects/all');
  }
}
