import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    title: 'Terms of Service',
    description: 'The terms governing your use of and membership in Ogeemo.',
};

export default function TermsLayout({ children }: { children: ReactNode }) {
    return <>{children}</>;
}