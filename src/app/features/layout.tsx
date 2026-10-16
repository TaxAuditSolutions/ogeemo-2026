import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    title: 'Features',
    description:
        'Explore the Ogeemo ecosystem: My Shortcuts, the Calendar, BKS Accounting, Project Forge, and a unified document manager - all connected.',
};

export default function FeaturesLayout({ children }: { children: ReactNode }) {
    return <>{children}</>;
}