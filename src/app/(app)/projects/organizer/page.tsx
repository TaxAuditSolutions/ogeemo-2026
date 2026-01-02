// This file is now obsolete. The functionality has been moved to /projects/[projectId]/organizer.
// This redirect is for backward compatibility and can be removed in a future cleanup.
import { redirect } from 'next/navigation';

export default function DeprecatedOrganizerPage() {
    redirect('/projects/all');
}
