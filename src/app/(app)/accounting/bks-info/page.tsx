import { redirect } from 'next/navigation';

export default function BksInfoRedirectPage() {
  // This page has been renamed to /accounting/bks.
  // This redirect is for backward compatibility.
  redirect('/accounting/bks');
}
