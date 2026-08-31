import { redirect } from 'next/navigation';

export default function CommandCentreRedirect() {
  // Permanent redirect to the new rebranded Ogeemo Co-Pilot hub
  redirect('/ai-dispatch');
}
