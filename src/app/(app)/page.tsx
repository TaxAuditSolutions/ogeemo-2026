import { redirect } from 'next/navigation';

/**
 * @fileOverview Redirects the authenticated root to the welcome page.
 * This handles cases where a logged-in user hits the application root.
 */
export default function AppPageRoot() {
  redirect('/welcome');
}
