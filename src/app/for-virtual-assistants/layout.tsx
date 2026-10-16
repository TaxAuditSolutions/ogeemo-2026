import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    title: 'Ogeemo for Virtual Assistants',
    description:
        'Manage multiple clients, tasks, and schedules from one workspace built for virtual assistants.',
};

export default function ForVirtualAssistantsLayout({ children }: { children: ReactNode }) {
    return <>{children}</>;
}