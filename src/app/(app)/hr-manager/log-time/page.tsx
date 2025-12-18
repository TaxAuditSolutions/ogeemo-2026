
import { redirect } from 'next/navigation';

export default function LogTimeRedirectPage() {
  // This page's functionality has been merged into the Time Log Report page.
  // This redirect is for backward compatibility.
  redirect('/reports/time-log');
}
