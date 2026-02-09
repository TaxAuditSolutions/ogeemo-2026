
'use client';

import dynamic from 'next/dynamic';
import { ContactsSkeleton } from '@/components/contacts/contacts-skeleton';

const ContactsView = dynamic(
  () => import('@/components/contacts/contacts-view').then((mod) => mod.ContactsView),
  {
    loading: () => <ContactsSkeleton />,
  }
);

export default function ContactsPage() {
  return <ContactsView />;
}
