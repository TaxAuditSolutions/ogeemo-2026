
import { redirect } from 'next/navigation';

export default function LoggedEventsRedirectPage() {
  // This page is now obsolete. The functionality has been centralized
  // into the main reports section.
  redirect('/reports/client-billing');
}
