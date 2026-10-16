import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    title: 'Privacy Policy',
    description: 'How Ogeemo collects, uses, and protects your information.',
};

export default function PrivacyLayout({ children }: { children: ReactNode }) {
    return <>{children}</>;
}