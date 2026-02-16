import { redirect } from 'next/navigation';

export default function CommandCentreRedirect() {
  // Permanent redirect to the new rebranded AI Dispatch hub
  redirect('/ai-dispatch');
}
