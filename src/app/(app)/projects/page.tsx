// This page has been removed as part of the project management refactor.
// The main entry points are now the Project List and Project Status pages.
// It is now safe to delete this file.
import { redirect } from 'next/navigation';

export default function ProjectsPage() {
  redirect('/projects/all');
}
