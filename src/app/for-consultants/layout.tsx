import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    title: 'Ogeemo for Consultants',
    description:
        'Manage complex client deliverables, projects, and billable time in one connected workspace.',
};

export default function ForConsultantsLayout({ children }: { children: ReactNode }) {
    return <>{children}</>;
}