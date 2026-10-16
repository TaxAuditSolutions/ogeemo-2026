import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    title: 'News',
    description: 'The latest news and updates from Ogeemo.',
};

export default function NewsLayout({ children }: { children: ReactNode }) {
    return <>{children}</>;
}