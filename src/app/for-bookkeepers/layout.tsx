import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    title: 'Ogeemo for Bookkeepers',
    description:
        'Cash-basis, source-linked bookkeeping built for bookkeepers: every entry traceable to its document.',
};

export default function ForBookkeepersLayout({ children }: { children: ReactNode }) {
    return <>{children}</>;
}