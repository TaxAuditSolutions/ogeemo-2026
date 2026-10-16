import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    title: 'Lead to Ledger',
    description:
        'The unbroken chain from first client contact to paid invoice: leads, quotes, projects, time, and books in one system.',
};

export default function LeadToLedgerLayout({ children }: { children: ReactNode }) {
    return <>{children}</>;
}