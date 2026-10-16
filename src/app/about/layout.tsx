import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    title: 'About',
    description:
        'The story behind Ogeemo: built by operators, accountants, and founders who were tired of fragmented business tools.',
};

export default function AboutLayout({ children }: { children: ReactNode }) {
    return <>{children}</>;
}