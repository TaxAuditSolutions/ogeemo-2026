
import { redirect } from 'next/navigation';

export default function ProjectsPage() {
  // The main project page is now the "all projects" list view.
  redirect('/projects/all');
}
