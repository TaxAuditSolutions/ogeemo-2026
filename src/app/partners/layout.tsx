import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    title: 'Partners',
    description:
        'Partnership pathways, architecture, and integration programs for the Ogeemo ecosystem.',
};

export default function PartnersLayout({ children }: { children: ReactNode }) {
    return <>{children}</>;
}