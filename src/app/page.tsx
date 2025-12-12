
import { redirect } from 'next/navigation';

export default function Home() {
  // The marketing site's home page is at /home
  // This page will redirect all root traffic there.
  // The AuthProvider handles routing for logged-in vs. logged-out users.
  redirect('/home');
}
