import { redirect } from 'next/navigation';

export default function ExplorePage() {
  // This page is now the "Features" page. Redirecting for SEO and link consistency.
  redirect('/features');
}
