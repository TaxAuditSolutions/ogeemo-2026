import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    title: 'Contact',
    description: 'Get in touch with the Ogeemo team - questions, feedback, or membership support.',
};

export default function ContactLayout({ children }: { children: ReactNode }) {
    return <>{children}</>;
}