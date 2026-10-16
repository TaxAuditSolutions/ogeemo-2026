import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    title: 'Ogeemo for Small Business',
    description:
        'Books, clients, quoting, and time in one system - replace five disconnected apps with Ogeemo.',
};

export default function ForSmallBusinessesLayout({ children }: { children: ReactNode }) {
    return <>{children}</>;
}