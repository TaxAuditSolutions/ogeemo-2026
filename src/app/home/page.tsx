
import { redirect } from 'next/navigation';

export default function HomePageRedirect() {
  // This page is deprecated and now redirects to website-2.
  redirect('/website-2');
}
