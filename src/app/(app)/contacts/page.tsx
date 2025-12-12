
import dynamic from 'next/dynamic';
import { ContactsSkeleton } from '@/components/contacts/contacts-skeleton';

const ContactsView = dynamic(
  () => import('@/components/contacts/contacts-view').then((mod) => mod.ContactsView),
  {
    ssr: false,
    loading: () => <ContactsSkeleton />,
  }
);


export default function ContactsPage() {
  return <ContactsView />;
}
