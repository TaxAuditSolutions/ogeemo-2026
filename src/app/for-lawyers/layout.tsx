import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    title: 'Ogeemo for Lawyers',
    description:
        'Run matters, clients, documents, and billable time from one system built for legal professionals.',
};

export default function ForLawyersLayout({ children }: { children: ReactNode }) {
    return <>{children}</>;
}