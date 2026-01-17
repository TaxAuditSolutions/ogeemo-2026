
import { redirect } from 'next/navigation';

export default function Home() {
  // The app's main entry point is the action manager dashboard.
  // The AuthProvider will handle redirecting unauthenticated users to the login page.
  redirect('/action-manager');
}
    