
import { redirect } from 'next/navigation';

export default function AccountingReportsRedirectPage() {
  // All reports have been moved to the main Accounting Hub.
  // This page now redirects to maintain clean navigation and fix a build error.
  redirect('/accounting');
}
