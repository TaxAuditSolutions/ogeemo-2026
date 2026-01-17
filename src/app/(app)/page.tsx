
import { redirect } from 'next/navigation';

export default function AppRootPage() {
  // Authenticated users should be redirected to the main application dashboard.
  redirect('/action-manager');
}
