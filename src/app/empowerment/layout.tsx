import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    title: 'Empowerment',
    description:
        'The movement behind Ogeemo: community, transparency, and operator empowerment.',
};

export default function EmpowermentLayout({ children }: { children: ReactNode }) {
    return <>{children}</>;
}