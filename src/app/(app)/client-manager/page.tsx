import { redirect } from 'next/navigation';

export default function ClientManagerRedirectPage() {
  // This entire manager is now obsolete.
  // Contacts are managed in the Contacts manager.
  // Time tracking is initiated from the Action Manager or Tasks and managed in Time Manager.
  // Reporting is in the Reports section.
  redirect('/contacts');
}
