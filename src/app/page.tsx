
import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect the root path to the primary landing page at /about
  redirect('/about');
}
