import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    title: 'Solutions',
    description:
        'See how solo owners, accountants, and growing teams run their entire business on one connected system.',
};

export default function SolutionsLayout({ children }: { children: ReactNode }) {
    return <>{children}</>;
}