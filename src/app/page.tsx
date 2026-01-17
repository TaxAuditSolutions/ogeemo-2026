
import { redirect } from 'next/navigation';

export default function Home() {
  // The app's entry point is now the marketing home page.
  // The AuthProvider handles routing for logged-in vs. logged-out users.
  redirect('/home');
}
    
