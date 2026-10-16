import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    title: 'Pricing - One Price. One Platform.',
    description:
        'One price, one platform: $30/month for up to 5 seats (each additional seat $5/month). Full suite access for every member, no feature gates.',
};

export default function PricingLayout({ children }: { children: ReactNode }) {
    return <>{children}</>;
}