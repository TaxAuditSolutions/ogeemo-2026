import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    title: 'Explore',
    description:
        'A full tour of everything Ogeemo can do - bookkeeping, clients, quoting, time, and AI-assisted workflows.',
};

export default function ExploreLayout({ children }: { children: ReactNode }) {
    return <>{children}</>;
}