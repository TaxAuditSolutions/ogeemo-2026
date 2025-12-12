
import { redirect } from 'next/navigation';

export default function CreateClientEntryRedirectPage() {
  // This page is now obsolete. The functionality has been centralized
  // into the Master Mind at /master-mind.
  redirect('/master-mind');
}
