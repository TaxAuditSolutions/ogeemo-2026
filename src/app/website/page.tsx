
import { redirect } from 'next/navigation';

export default function WebsiteRedirectPage() {
  // Permanent redirect to the consolidated /about URL
  redirect('/about');
}
