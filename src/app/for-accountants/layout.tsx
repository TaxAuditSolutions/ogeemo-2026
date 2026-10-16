import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    title: 'Ogeemo for Accountants',
    description:
        'Audit-ready books and continuous bookkeeping for accounting professionals - one system for your practice and your clients.',
};

export default function ForAccountantsLayout({ children }: { children: ReactNode }) {
    return <>{children}</>;
}