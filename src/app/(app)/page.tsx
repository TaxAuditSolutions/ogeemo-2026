
import { redirect } from 'next/navigation';

export default function AppRootPage() {
  // Authenticated users will be redirected from /home to /action-manager by the AuthProvider.
  // This page simply handles the case where an authenticated user manually navigates to the app root.
  redirect('/home');
}
