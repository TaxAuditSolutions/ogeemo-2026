import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    title: 'Ogeemo for Paralegals',
    description:
        'Organize case work, documents, deadlines, and client communication in one connected system.',
};

export default function ForParalegalsLayout({ children }: { children: ReactNode }) {
    return <>{children}</>;
}