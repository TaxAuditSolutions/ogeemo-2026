
import { redirect } from 'next/navigation';

export default function ProjectDetailsRedirectPage({ params }: { params: { projectId: string } }) {
  // The main view for a project is now the tasks Kanban board.
  // Redirect users there to avoid confusion.
  redirect(`/projects/${params.projectId}/tasks`);
}
