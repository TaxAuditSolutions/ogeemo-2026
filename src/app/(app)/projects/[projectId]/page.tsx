import { redirect } from 'next/navigation';

export default async function ProjectDetailsRedirectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  // The main view for a project is now the tasks Kanban board.
  // Redirect users there to avoid confusion.
  redirect(`/projects/${projectId}/tasks`);
}
