
import { redirect } from 'next/navigation';

export default function CreateClientEntryRedirectPage() {
  // This page is now obsolete. The functionality has been centralized
  // into the Time Manager at /master-mind.
  redirect('/master-mind');
}
